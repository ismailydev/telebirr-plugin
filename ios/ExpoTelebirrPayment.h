#import <React/RCTBridgeModule.h>
#import "EthiopiaPaySDK/EthiopiaPayManager.h"

@interface ExpoTelebirrPaymentModule : NSObject <RCTBridgeModule, EthiopiaPayManagerDelegate>

@end