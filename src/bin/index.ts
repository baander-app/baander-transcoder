#!/usr/bin/env node
import { CliCore } from '@tsed/cli-core';
import { config } from '../config';
import { HelloCommand } from './hello.command';

CliCore.bootstrap({
  ...config,
  commands: [
    HelloCommand,
  ],
}).catch(console.error);