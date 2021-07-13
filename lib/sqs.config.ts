import { Injectable } from '@nestjs/common';
import { SqsConfigOptions } from './sqs.types';

@Injectable()
export class SqsConfig {
  public options: SqsConfigOptions | Promise<SqsConfigOptions>;

  // eslint-disable-next-line @typescript-eslint/explicit-member-accessibility
  constructor(configOptions: SqsConfigOptions | Promise<SqsConfigOptions>) {
    this.options = configOptions;
  }
}
