import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
import { DiscoveryModule, DiscoveryService } from '@nestjs-plus/discovery';

import { SqsService } from './sqs.service';
import { SqsAsyncConfig } from './sqs.interfaces';
import { SqsQueueOptions } from './sqs.types';
import { SqsConfig } from './sqs.config';

@Global()
@Module({})
export class SqsModule {
  public static forRootAsync(asyncSqsConfig: SqsAsyncConfig): DynamicModule {
    const imports = this.getUniqImports([asyncSqsConfig]);
    const SqsConfigProvider = this.createAsyncConfigProvider(asyncSqsConfig);

    return {
      global: true,
      module: SqsModule,
      imports,
      providers: [SqsConfigProvider],
      exports: [SqsConfigProvider],
    };
  }

  private static createAsyncConfigProvider(options: SqsAsyncConfig): Provider {
    return {
      provide: SqsConfig,
      useFactory: options.useFactory,
      inject: options.inject || [],
    };
  }

  public static registerQueue(options: SqsQueueOptions) {
    const sqsProvider: Provider = {
      provide: SqsService,
      useFactory: async (discover: DiscoveryService, sqsConfig: SqsConfig) => {
        return new SqsService(await sqsConfig.options, options, discover);
      },
      inject: [DiscoveryService, SqsConfig],
    };

    return {
      global: true,
      module: SqsModule,
      imports: [DiscoveryModule],
      providers: [sqsProvider],
      exports: [sqsProvider],
    };
  }

  private static getUniqImports(options: Array<SqsAsyncConfig>) {
    return (
      options
        .map((option) => option.imports)
        .reduce((acc, i) => acc.concat(i || []), [])
        .filter((v, i, a) => a.indexOf(v) === i) || []
    );
  }
}
