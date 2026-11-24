/** Small per-browser conveniences. Every access is wrapped: storage can be blocked or full. */

const FIT_KEY = "curvefit.fit.v1";
const TOKENS_KEY = "curvefit.deleteTokens.v1";

export interface FitProfile {
  heightCm: number;
  hipCm: number;
}

function read<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

/** Remembers height and hip locally so reviews can be filtered to "people like me". */
export const getFitProfile = () => read<FitProfile>(FIT_KEY);
export const FIT_EVENT = "curvefit:fit";
export const saveFitProfile = (p: FitProfile) => {
  write(FIT_KEY, p);
  // Lets other components on the page (e.g. the reviews filter) pick it up straight away.
  window.dispatchEvent(new Event(FIT_EVENT));
};
export const usedSizeFinder = () => getFitProfile() !== null;

/** Delete tokens for measurements the customer agreed to save, so they can erase them. */
export const getDeleteTokens = () => read<string[]>(TOKENS_KEY) ?? [];
export const addDeleteToken = (t: string) => write(TOKENS_KEY, [...getDeleteTokens(), t]);
export const clearDeleteTokens = () => write(TOKENS_KEY, []);
