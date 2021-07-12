import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
import { SqsService } from './sqs.service';
import { DiscoveryModule, DiscoveryService } from '@nestjs-plus/discovery';
import { SqsAsyncConfig } from './sqs.interfaces';
import { SqsQueueOptions, SqsConfigOptions } from './sqs.types';

@Global()
@Module({})
export class SqsModule {
  private static config: SqsConfigOptions | Promise<SqsConfigOptions>;

  // eslint-disable-next-line @typescript-eslint/explicit-member-accessibility
  public static getConfig() {
    return SqsModule.config;
  }

  private static getUniqImports(options: Array<SqsAsyncConfig>) {
    return (
      options
        .map((option) => option.imports)
        .reduce((acc, i) => acc.concat(i || []), [])
        .filter((v, i, a) => a.indexOf(v) === i) || []
    );
  }

  public static forRootAsync(asyncSqsConfig: SqsAsyncConfig): DynamicModule {
    const imports = this.getUniqImports([asyncSqsConfig]);
    this.config = asyncSqsConfig.useFactory();

    return {
      global: true,
      module: SqsModule,
      imports,
    };
  }

  public static registerQueue(options: SqsQueueOptions) {
    const sqsProvider: Provider = {
      provide: SqsService,
      useFactory: async (discover: DiscoveryService) => new SqsService(await SqsModule.config, options, discover),
      inject: [DiscoveryService],
    };

    return {
      global: true,
      module: SqsModule,
      imports: [DiscoveryModule],
      providers: [sqsProvider],
      exports: [sqsProvider],
    };
  }
}
