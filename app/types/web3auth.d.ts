// Global type definitions for Web3Auth
declare global {
  interface Window {
    web3auth?: {
      getUserInfo(): Promise<{
        email?: string;
        name?: string;
        profileImage?: string;
        typeOfLogin?: string;
        verifier?: string;
        verifierId?: string;
        aggregateVerifier?: string;
        dappShare?: string;
        idToken?: string;
        oAuthIdToken?: string;
        oAuthAccessToken?: string;
      }>;
      // Add other Web3Auth methods as needed
      connected: boolean;
      status: string;
    };
  }
}

export {};
