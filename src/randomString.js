const ascii = {
  lowerCase: () => 'abcdefghijklmnopqrstuvwxyz'.split(''),
  upperCase: () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
  numbers: () => '0123456789'.split(''),
}

export default (length, select) => {
  const pool = [
    ...(select.lower ? ascii.lowerCase() : []),
    ...(select.upper ? ascii.upperCase() : []),
    ...(select.numbers ? ascii.numbers() : []),
  ]
  if (pool.length === 0) throw Error('[randomString] must select char type')
  return Array(length).fill().map(() => pool[Math.floor(Math.random() * pool.length) | 0]).join('')
}
