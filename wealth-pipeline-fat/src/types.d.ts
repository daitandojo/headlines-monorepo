// apps/headlines-pipeline/src/types.d.ts
// File 2 of 5
// One-line rationale: Shim for legacy models package types to fix TS7016 errors.

declare module '@wealth/data' {
  export interface IOpportunity {
    [key: string]: any
  }
  export interface ISynthesizedEvent {
    [key: string]: any
  }
  export const headlineAssessmentSchema: any
  export const articleAssessmentSchema: any
  export const clusteringSchema: any
  export const emailIntroSchema: any
  export const dbConnect: any
}

declare module '@wealth/data/node' {
  export const settings: {
    SIGNIFICANT_PRIVATE_BENEFICIARY_USD_MM: number
    HIGH_VALUE_DEAL_USD_MM: number
  }
}

declare module '@headlines/data-access' {
  export * from '@wealth/access'
}

declare module '@headlines/models' {
  export * from '@wealth/data'
}

declare module '@headlines/utils-server' {
  export * from '@shared/server'
}
