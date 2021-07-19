import * as SQS from 'aws-sdk/clients/sqs';
import { ModuleMetadata } from '@nestjs/common';
import { SqsConfigOptions, SqsConsumerEvent } from './sqs.types';

export interface Message<T = any> {
  id: string;
  body: T;
  groupId?: string;
  deduplicationId?: string;
  delaySeconds?: number;
  messageAttributes?: SQS.MessageBodyAttributeMap;
}

export interface SqsAsyncConfig extends Pick<ModuleMetadata, 'imports'> {
  useFactory?: (...args: any[]) => SqsConfigOptions | Promise<SqsConfigOptions>;
  inject?: any[];
}

export interface SqsMessageHandlerMeta {
  batch?: boolean;
}

export interface SqsConsumerEventHandlerMeta {
  eventName: SqsConsumerEvent;
}

export interface SqsProcessMeta {
  name: string;
}
