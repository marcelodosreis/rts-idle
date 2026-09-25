export function hasExplicitE2eScope(args: readonly string[], isSpecFile: (argument: string) => boolean): boolean {
  const hasProjectSelector = args.some((argument) => argument === '--project' || argument.startsWith('--project='))
  const hasGrepSelector = args.some((argument) => argument === '--grep' || argument.startsWith('--grep='))
  const hasTestFile = args.some((argument) => !argument.startsWith('-') && isSpecFile(argument))

  return hasProjectSelector || hasGrepSelector || hasTestFile
}
