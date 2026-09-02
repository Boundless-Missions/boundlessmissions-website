"use client";

/**
 * friends.ts — client calls for the friend list.
 *
 * Friendship is what quicksend is gated on: the KSP mod can only hand a craft to an
 * accepted friend, and for a live vessel that hand-over deletes the ship out of the
 * sender's save. So this list exists on the website for one reason above all — a
 * request sent from inside the game has to be answerable by someone who does not
 * have KSP open.
 *
 * Everything goes through the same-origin BFF, never to the bot directly, so the
 * session token stays in the httpOnly cookie — the same rule `account.ts` follows.
 */
import { appCheckHeader } from "./firebase";
import { notifySessionChanged } from "./session";
import { jsonOrThrow, safeFetch } from "./api-error";

export interface Friend {
  user_id: string;
  name: string;
  /** The permanent Boundless username — what someone else types to add them. */
  username?: string;
  avatar_url?: string | null;
  level?: number;
  /** Epoch seconds: when the friendship began, or when the request was sent. */
  at?: number;
  /** Presentation only. A friendship never depends on it. */
  discord?: boolean;
}

export interface FriendList {
  friends: Friend[];
  incoming: Friend[];
  outgoing: Friend[];
  max_friends?: number;
}

export interface FriendActionResult {
  success: boolean;
  message: string;
  state?: string;
}

export type FriendAction = "accept" | "decline" | "remove";

async function authedFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  for (const [k, v] of Object.entries(await appCheckHeader())) headers.set(k, v);
  const res = await safeFetch(input, { ...init, headers });
  notifySessionChanged();
  return res;
}

/** The signed-in account's friends and pending requests, or null when signed out. */
export async function fetchFriends(): Promise<FriendList | null> {
  const res = await authedFetch("/api/friends", { cache: "no-store" });
  if (res.status === 401) return null;
  return jsonOrThrow<FriendList>(res);
}

/**
 * Ask a player to be friends, by their Boundless username.
 *
 * Deliberately the only way in from a browser: an account id is something a picker
 * holds, and the website has no player roster to pick from — a name someone told
 * you is the whole interface. The bot still accepts an id, which is what the KSP
 * client's "pick from your Discord server" list uses.
 */
export async function requestFriend(username: string): Promise<FriendActionResult> {
  const res = await authedFetch("/api/friends/request", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username }),
  });
  return jsonOrThrow<FriendActionResult>(res);
}

/** accept / decline / remove. "decline" also withdraws a request you sent — on the
 *  server they are one edit, and only the word beside the button differs. */
export async function friendAction(
  userId: string,
  action: FriendAction,
): Promise<FriendActionResult> {
  const res = await authedFetch(`/api/friends/${encodeURIComponent(userId)}/${action}`, {
    method: "POST",
  });
  return jsonOrThrow<FriendActionResult>(res);
}

/**
 * Turn down every pending incoming request in one action.
 *
 * The escape hatch for a stuffed inbox: the bot caps `incoming` at 100 and refuses
 * every further request once it is full — honest ones included — so a flood locks
 * the account out of new friendships, and out of being quicksent a craft by anyone
 * new. Clearing it one at a time is a hundred calls against a limiter; this is one
 * transaction on the server. The count comes back in `message`.
 */
export async function declineAllFriendRequests(): Promise<FriendActionResult> {
  const res = await authedFetch("/api/friends/decline_all", { method: "POST" });
  return jsonOrThrow<FriendActionResult>(res);
}
