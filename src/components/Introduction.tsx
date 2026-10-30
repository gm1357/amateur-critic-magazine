import { ISSUE } from '../magazine';

// Block flow, not flex: like a review, this is poured into the page's columns and has to be
// able to break between them. The heading is kept whole and the body is left free to run
// over, set the way a review's body is so the issue reads as one hand.
export default function Introduction() {
  return (
    <article className="text-[length:var(--page-type)]">
      <header className="mx-auto max-w-[62ch] break-inside-avoid border-b border-rule pb-[3cqw]">
        <p className="text-[0.7em] tracking-[0.24em] text-accent uppercase">{ISSUE}</p>
        <h1 className="mt-[2.5cqw] font-heading text-[6cqw] tracking-tight text-ink">
          Introduction
        </h1>
      </header>

      {/* Placeholder copy. */}
      <div className="mx-auto mt-[4cqw] max-w-[62ch] space-y-[2cqw] font-heading leading-relaxed text-pretty hyphens-auto text-ink">
        <p className="drop-cap">
          <strong>What is this?</strong> This website acts as a virtual magazine where I share my
          personal reviews on movies that I have watched. My written reviews came before the
          creation of this website, as a way for me to practice writing and expressing my thoughts
          on films, never with the intention of professional publication. After a while, the idea to
          come up with a personal blog to put those reviews in became appealing, and so the idea to
          put this in the format of a virtual magazine was born. With this website, I marry my
          passion for cinema with my skills in web development, creating an engaging platform for
          sharing my thoughts and reviews. As a disclaimer, the writings here are all personally
          written, without the assistance of AI. The code in the other hand, is a mix of AI assisted
          code generation and my knowledge guiding it.
        </p>
        <p>
          <strong>Who is writing this anyway?</strong> My name is Gabriel Machado, I'm the ideator,
          writer, and developer of this magazine web application. I am not a professional reviewer,
          don't have any formal credentials in the journalism or entertainment fields, and my
          opinions are purely personal, so don't take those reviews so seriously, have fun reading
          instead and contact me if you have any questions or feedback. What I really am a
          professional at, is creating and developing engaging web applications, which is how this
          virtual magazine came to be.
        </p>
        <p>
          <strong>Why read this?</strong> I Won't lie and say that this could be used as a curated
          guide for movies to watch, the films put here are the ones I'm watching without rhyme or
          reason, sometimes I stumble upon good ones, and sometimes not. But, with that in mind, I
          hope that you at least go through some pages, read some reviews, and maybe even find
          something that resonates with you.
        </p>
        <p>
          If you want to look under the hood and see how this website is built, take a look at the{' '}
          <a
            href="https://github.com/gm1357/amateur-critic-magazine"
            className="text-accent underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub Repository
          </a>
          . If you want to keep up with my latest movie updates and reviews, consider following my{' '}
          <a
            href="https://letterboxd.com/gmachado42/"
            className="text-accent underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Letterboxd account
          </a>
          . If you like what you saw here, and want to keep in touch with me in a professional
          manner, connect with me on{' '}
          <a
            href="https://www.linkedin.com/in/gabriel-machado-br/"
            className="text-accent underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            LinkedIn
          </a>
          . If you have any questions or feedback, feel free to leave me a message at{' '}
          <a
            href="mailto:g_machado1@hotmail.com"
            className="text-accent underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            g_machado1@hotmail.com
          </a>
          .
        </p>
      </div>
    </article>
  );
}
