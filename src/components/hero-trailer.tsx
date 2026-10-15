"use client";

import { useState } from "react";
import { Play } from "lucide-react";

/**
 * The hero visual: the trailer.
 *
 * Deliberately a click-to-play facade rather than a bare <iframe>. An iframe on the
 * front page contacts YouTube — and sets its cookies — on every visit, before the
 * visitor has asked for anything, which is the opposite of what the add-on itself
 * promises ("nothing is sent before you agree"). So nothing loads until the poster
 * is clicked; the poster is a still image, and only then does the player appear.
 *
 * Uses youtube-nocookie.com, and the poster falls back to hqdefault because
 * maxresdefault does not exist for every upload (YouTube answers those with a
 * 120x90 grey placeholder rather than a 404, so onError alone would not catch it —
 * the natural width check does).
 */

const VIDEO_ID = "tWzVSuhJvY8";
const TITLE = "Boundless Missions trailer";

export function HeroTrailer() {
  const [playing, setPlaying] = useState(false);
  const [poster, setPoster] = useState(
    `https://i.ytimg.com/vi/${VIDEO_ID}/maxresdefault.jpg`,
  );

  const fallbackPoster = () =>
    setPoster(`https://i.ytimg.com/vi/${VIDEO_ID}/hqdefault.jpg`);

  return (
    <div className="relative aspect-video overflow-hidden rounded-2xl border border-border bg-card/80 shadow-2xl">
      {playing ? (
        <iframe
          className="absolute inset-0 h-full w-full"
          src={`https://www.youtube-nocookie.com/embed/${VIDEO_ID}?autoplay=1&rel=0&modestbranding=1`}
          title={TITLE}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          aria-label={`Play the ${TITLE}`}
          className="group absolute inset-0 h-full w-full cursor-pointer"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={poster}
            alt=""
            aria-hidden="true"
            loading="eager"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
            onError={fallbackPoster}
            onLoad={(e) => {
              if (e.currentTarget.naturalWidth <= 121) fallbackPoster();
            }}
          />
          <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent" />

          <span className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-4">
            <span className="flex h-16 w-16 items-center justify-center rounded-full border border-primary/40 bg-primary/15 text-primary backdrop-blur-sm transition group-hover:scale-105 group-hover:bg-primary/25 sm:h-20 sm:w-20">
              <Play className="h-6 w-6 translate-x-0.5 fill-current sm:h-8 sm:w-8" />
            </span>
            <span className="text-xs font-medium text-foreground/90 sm:text-sm">
              Watch the trailer
            </span>
          </span>
        </button>
      )}
    </div>
  );
}
