import { SqsConfigOptions, SqsQueueOptions, SqsQueueType } from './sqs.types';

export class SqsStorage {
  private static queueOptions: SqsQueueOptions = [];
  private static config: SqsConfigOptions;

  public static getConfig(): SqsConfigOptions {
    return this.config;
  }

  public static getQueueOptions(): SqsQueueOptions {
    return this.queueOptions;
  }

  public static setConfig(config: SqsConfigOptions) {
    if (this.config !== undefined) {
      console.warn('config is already setted');
    }
    this.config = config;
  }

  public static addQueueOptions(options: SqsQueueOptions) {
    const queueOptions = options.map((option) => {
      return {
        ...option,
        type: option.type || SqsQueueType.All,
      };
    });
    this.queueOptions.push(...queueOptions);
  }
}
