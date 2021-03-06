import { ApolloLink, Observable, Operation } from 'apollo-link';
import { GraphQLError, ExecutionResult } from 'graphql';

export interface ErrorResponse {
  graphQLErrors?: GraphQLError[];
  networkError?: Error;
  response?: ExecutionResult;
  operation: Operation;
}

export type ErrorHandler = (error: ErrorResponse) => void;

export const onError = (errorHandler: ErrorHandler): ApolloLink => {
  return new ApolloLink((operation, forward) => {
    return new Observable(observer => {
      let sub;
      try {
        sub = forward(operation).subscribe({
          next: result => {
            if (result.errors) {
              errorHandler({
                graphQLErrors: result.errors,
                response: result,
                operation,
              });
            }
            observer.next(result);
          },
          error: networkError => {
            errorHandler({
              operation,
              networkError,
            });
            observer.error(networkError);
          },
          complete: observer.complete.bind(observer),
        });
      } catch (e) {
        errorHandler({ networkError: e, operation });
        observer.error(e);
      }

      return () => {
        if (sub) sub.unsubscribe();
      };
    });
  });
};

export class ErrorLink extends ApolloLink {
  private link: ApolloLink;
  constructor(errorHandler: ErrorHandler) {
    super();
    this.link = onError(errorHandler);
  }

  public request(operation, forward): Observable<ExecutionResult> | null {
    return this.link.request(operation, forward);
  }
}
