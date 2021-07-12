# @pickk/nest-sqs

@pickk/nest-sqs is forked version of @ssut/nestjs-sqs

This library internally uses [bbc/sqs-producer](https://github.com/bbc/sqs-producer) and [bbc/sqs-consumer](https://github.com/bbc/sqs-consumer), and implements some more useful features on top of the basic functionality given by them. this library is only for Amazon SQS.

## Installation

```shell script
$ npm i --save @pickk/nest-sqs
```

## Quick Start

### Register module

For use @pickk/nest-sqs You have to perform two methods to register a module. First you have to register Amazon SQS config options.

```ts
@Module({
  imports: [
    SqsModule.forRootAsync({
      imports:[ConfigModule],
      useFactory:(configService)=>{
        // return SQS.Types.ClientConfiguration & accountNumber(string type)
        return {...}
      },
      injects:[ConfigSerivce]
    }),
  ],
})
class AppModule {}
```

Second you have to register queues.

```ts
SqsModule.registerQueues([
  {
    name: 'queueName',
    type: 'ALL' // 'ALL'|'CONSUMER'|'PRODUCER'
    consumerOptions?: {},
    producerOptions?: {}
  },
  ...
]);
```

### Decorate methods

You need to decorate methods in your NestJS providers in order to have them be automatically attached as event handlers for incoming SQS messages:

```ts
@SqsProcess(/** name: */'queueName)
export class AppMessageHandler {
  @SqsMessageHandler(/** batch: */ false)
  public async handleMessage(message: AWS.SQS.Message) {}

  @SqsConsumerEventHandler(/** eventName: */ SqsConsumerEvent.PROCESSING_ERROR)
  public onProcessingError(error: Error, message: AWS.SQS.Message) {
    // report errors here
  }
}
```

One class can only handle one queue. so if you want to enroll dead letter queue, you have to make new class that handle dead letter queue

### Produce messages

```ts
export class AppService {
  public constructor(
    private readonly sqsService: SqsService,
  ) { }

  public async dispatchSomething() {
    await this.sqsService.send(/** name: */ 'queueName', {
      id: 'id',
      body: { ... },
      groupId: 'groupId',
      deduplicationId: 'deduplicationId',
      messageAttributes: { ... },
      delaySeconds: 0,
    });
  }
}
```

### Configuration

See [here](https://github.com/ybh1760/nest-sqs/blob/master/lib/sqs.types.ts), and note that we have same configuration as [bbc/sqs-consumer's](https://github.com/bbc/sqs-producer).
In most time you just need to specify both `name` and `queueUrl` at the minimum requirements.

## License

This project is licensed under the terms of the MIT license.
