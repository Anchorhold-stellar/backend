import { Response } from 'express';

/**
 * List endpoints return a bare array (not {data, total}) to keep the
 * response shape stable for existing consumers — total count instead
 * rides along as a response header, a common REST convention (GitHub's
 * API does the same) that pagination UIs can read without changing how
 * the body is parsed.
 */
export function setTotalCountHeader(res: Response, total: number): void {
  res.setHeader('X-Total-Count', String(total));
}
