import * as commander from 'commander';
import { provisionDefaultConfig } from './commands/init';
import { registerClearCacheCommand } from './commands/clearCache';
import { registerServeCommand } from './commands/serve';

const program = new commander.Command('baander-transcoder');
program.version('1.0.0', '-v, --version');
program.description('Baander Transcoder');

// Register commands
registerServeCommand(program);
registerClearCacheCommand(program);

const initCmd = program.command('init');
initCmd.description('Provisions a default config.json if one does not exist.');
initCmd.action(async () => {
  await provisionDefaultConfig();
});

program.parse(process.argv);

