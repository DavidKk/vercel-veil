/* eslint-disable no-console */
const PREFIX = '[vercel-veil]'

export function info(...args: any[]) {
  console.info(PREFIX, ...args)
}

export function warn(...args: any[]) {
  console.warn(PREFIX, ...args)
}

export function fail(...args: any[]) {
  console.error(PREFIX, ...args)
}

export function debug(...args: any[]) {
  if (process.env.NODE_ENV !== 'production') {
    console.debug(PREFIX, ...args)
  }
}
