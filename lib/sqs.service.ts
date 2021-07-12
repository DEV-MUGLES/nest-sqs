import { Consumer } from 'sqs-consumer';
import { Producer } from 'sqs-producer';
import type { QueueAttributeName } from 'aws-sdk/clients/sqs';
import * as SQS from 'aws-sdk/clients/sqs';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { DiscoveryService } from '@nestjs-plus/discovery';

import { QueueName, SqsQueueOptions, SqsQueueType, SqsConfigOptions } from './sqs.types';
import { SqsProcessMeta, SqsConsumerEventHandlerMeta, SqsMessageHandlerMeta, Message } from './sqs.interfaces';
import { SQS_CONSUMER_EVENT_HANDLER, SQS_CONSUMER_METHOD, SQS_PROCESS } from './sqs.constants';

@Injectable()
export class SqsService implements OnModuleInit, OnModuleDestroy {
  public readonly consumers = new Map<QueueName, Consumer>();
  public readonly producers = new Map<QueueName, Producer>();

  private readonly logger = new Logger('SqsService', false);

  public constructor(
    private readonly sqsConfig: SqsConfigOptions,
    private readonly queueOptions: SqsQueueOptions,
    private readonly discover: DiscoveryService,
  ) {}

  public async onModuleInit(): Promise<void> {
    const processes = await this.discover.providersWithMetaAtKey<SqsProcessMeta>(SQS_PROCESS);
    const sqs: SQS = new SQS(this.sqsConfig);
    const { endpoint, accountNumber, region } = this.sqsConfig;

    const consumerOptions = this.queueOptions.filter(
      (v) => v.type === SqsQueueType.All || v.type === SqsQueueType.Consumer,
    );
    const producerOptions = this.queueOptions.filter(
      (v) => v.type === SqsQueueType.All || v.type === SqsQueueType.Producer,
    );

    consumerOptions.forEach((option) => {
      const { name, consumerOptions } = option;
      if (this.consumers.has(name)) {
        throw new Error(`Consumer already exists: ${name}`);
      }
      const processMetadata = processes.find(({ meta }) => meta.name === name);
      const { discoveredClass } = processMetadata;

      const messageHandlers = this.discover.classMethodsWithMetaAtKey<SqsMessageHandlerMeta>(
        discoveredClass,
        SQS_CONSUMER_METHOD,
      );
      const eventHandlers = this.discover.classMethodsWithMetaAtKey<SqsConsumerEventHandlerMeta>(
        discoveredClass,
        SQS_CONSUMER_EVENT_HANDLER,
      );
      const metadata = messageHandlers[0];

      if (!metadata) {
        this.logger.warn(`No metadata found for: ${name}`);
      }

      const isBatchHandler = metadata.meta.batch === true;
      const consumer = Consumer.create({
        queueUrl: `${endpoint}/${accountNumber}/${name}`,
        region,
        sqs,
        ...consumerOptions,
        ...(isBatchHandler
          ? {
              handleMessageBatch: metadata.discoveredMethod.handler.bind(
                metadata.discoveredMethod.parentClass.instance,
              ),
            }
          : { handleMessage: metadata.discoveredMethod.handler.bind(metadata.discoveredMethod.parentClass.instance) }),
      });

      for (const eventMetadata of eventHandlers) {
        if (eventMetadata) {
          consumer.addListener(
            eventMetadata.meta.eventName,
            eventMetadata.discoveredMethod.handler.bind(metadata.discoveredMethod.parentClass.instance),
          );
        }
      }
      this.consumers.set(name, consumer);
    });

    producerOptions.forEach((option) => {
      const { name, producerOptions } = option;
      if (this.producers.has(name)) {
        throw new Error(`Producer already exists: ${name}`);
      }

      const producer = Producer.create({
        queueUrl: `${endpoint}/${accountNumber}/${name}`,
        region,
        sqs,
        ...producerOptions,
      });
      this.producers.set(name, producer);
    });

    for (const consumer of this.consumers.values()) {
      consumer.start();
    }
  }

  public onModuleDestroy() {
    for (const consumer of this.consumers.values()) {
      consumer.stop();
    }
  }

  private getQueueInfo(name: QueueName) {
    if (!this.consumers.has(name) && !this.producers.has(name)) {
      throw new Error(`Consumer/Producer does not exist: ${name}`);
    }

    const { sqs, queueUrl } = (this.consumers.get(name) ?? this.producers.get(name)) as {
      sqs: SQS;
      queueUrl: string;
    };
    if (!sqs) {
      throw new Error('SQS instance does not exist');
    }

    return {
      sqs,
      queueUrl,
    };
  }

  public async purgeQueue(name: QueueName) {
    const { sqs, queueUrl } = this.getQueueInfo(name);
    return sqs
      .purgeQueue({
        QueueUrl: queueUrl,
      })
      .promise();
  }

  public async getQueueAttributes(name: QueueName) {
    const { sqs, queueUrl } = this.getQueueInfo(name);
    const response = await sqs
      .getQueueAttributes({
        QueueUrl: queueUrl,
        AttributeNames: ['All'],
      })
      .promise();
    return response.Attributes as { [key in QueueAttributeName]: string };
  }

  public getProducerQueueSize(name: QueueName) {
    if (!this.producers.has(name)) {
      throw new Error(`Producer does not exist: ${name}`);
    }

    return this.producers.get(name).queueSize();
  }

  public send<T = any>(name: QueueName, payload: Message<T> | Message<T>[]) {
    if (!this.producers.has(name)) {
      throw new Error(`Producer does not exist: ${name}`);
    }

    const originalMessages = Array.isArray(payload) ? payload : [payload];
    const messages = originalMessages.map((message) => {
      let body = message.body;
      if (typeof body !== 'string') {
        body = JSON.stringify(body) as any;
      }

      return {
        ...message,
        body,
      };
    });

    const producer = this.producers.get(name);
    return producer.send(messages as any[]);
  }
}
