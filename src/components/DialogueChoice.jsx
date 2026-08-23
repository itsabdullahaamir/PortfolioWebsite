import { useRef } from 'react';
import Typewriter from './Typewriter.jsx';
import { useSound } from '../lib/sound.js';

/**
 * Dialogue choices as navigation — mechanic 2, spec section 5.
 * Renders a stacked list of choices (Telltale's four-option layout,
 * already flattened for mobile per spec 2.6). Always include a
 * `silent: true` option upstream in data for the "[silence]" affordance.
 *
 * Choices are shortcuts to content already on the page, never gates:
 * `onSelect` should scroll/reveal, not navigate away.
 */
export default function DialogueChoice({ prompt, options, onSelect }) {
  const itemRefs = useRef([]);
  const playSound = useSound();

  const focusIndex = (index) => {
    const clamped = (index + options.length) % options.length;
    itemRefs.current[clamped]?.focus();
    playSound('navigate');
  };

  const handleKeyDown = (event, index) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      focusIndex(index + 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      focusIndex(index - 1);
    } else if (event.key === 'Escape') {
      itemRefs.current[index]?.blur();
    }
  };

  return (
    <div role="group" aria-label={prompt ?? 'Choices'} className="my-6 max-w-xl">
      {/* The prompt is the one genuinely dialogue-styled string in the
          app, so it is the only thing that gets the typewriter (see
          Typewriter.jsx for why panel bodies deliberately don't). The
          quote marks sit outside it so they're present immediately —
          typing them out one at a time looks like a rendering glitch
          rather than speech. */}
      {prompt ? (
        <p className="mb-3 border-[3px] border-ink bg-shadow px-4 py-2 font-body text-bone shadow-[4px_4px_0_var(--ink)]">
          &ldquo;
          <Typewriter text={prompt} />
          &rdquo;
        </p>
      ) : null}
      <ul className="flex flex-col gap-2">
        {options.map((option, index) => (
          <li key={option.label}>
            <button
              ref={(el) => (itemRefs.current[index] = el)}
              type="button"
              onClick={() => {
                playSound('select');
                onSelect?.(option);
              }}
              onKeyDown={(event) => handleKeyDown(event, index)}
              className={`group flex w-full items-center gap-2 border-none bg-transparent px-2 py-1 text-left font-body text-base transition-transform duration-[120ms] ease-out hover:translate-x-1 focus-visible:translate-x-1 ${
                option.silent ? 'text-shadow/70 italic' : 'text-ink'
              }`}
            >
              <span
                aria-hidden="true"
                className="h-4 w-[3px] origin-left scale-x-0 bg-signal transition-transform duration-[120ms] ease-out group-hover:scale-x-100 group-focus-visible:scale-x-100"
              />
              <span>▸ {option.label}</span>
              {option.silent ? <span className="ml-1 text-xs">[silence]</span> : null}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
