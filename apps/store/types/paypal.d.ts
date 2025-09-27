declare module '@paypal/checkout-server-sdk' {
  export class Environment {
    constructor(clientId: string, clientSecret: string);
  }

  export class SandboxEnvironment extends Environment {
    constructor(clientId: string, clientSecret: string);
  }

  export class LiveEnvironment extends Environment {
    constructor(clientId: string, clientSecret: string);
  }

  export class PayPalHttpClient {
    constructor(environment: Environment);
    execute(request: any): Promise<any>;
  }

  export namespace orders {
    export class OrdersCreateRequest {
      requestBody(body: any): void;
    }

    export class OrdersCaptureRequest {
      constructor(orderId: string);
    }

    export class OrdersGetRequest {
      constructor(orderId: string);
    }
  }
}