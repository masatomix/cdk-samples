import { CfnResource, Stack } from 'aws-cdk-lib'

export const region = 'ap-northeast-1'
export const availabilityZones = [`${region}a`, `${region}c`, `${region}d`]

export const getProfile = (stack: Stack): any => {
  // --context profile=xxx が指定されてなかったらデフォルト値 dev にする
  const profileStr = stack.node.tryGetContext('profile') ?? 'dev'
  // xxx もしくはdevとかで cdk.json から設定をとる
  const profile = stack.node.tryGetContext(profileStr)
  if (!profile) {
    throw new Error(`profile=${profileStr} の環境設定が取得できず`)
  }
  return profile
}

export const toRefs = (instances: CfnResource[]): string[] => instances.map((instance) => instance.ref)
