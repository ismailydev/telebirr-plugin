//
//  ExpoTelebirrPayment.mm
//  Expo Telebirr Plugin
//

#import "ExpoTelebirrPayment.h"

@interface ExpoTelebirrPaymentModule ()

// Properties to store resolve/reject blocks
@property (nonatomic, copy) RCTPromiseResolveBlock resolve;
@property (nonatomic, copy) RCTPromiseRejectBlock reject;

@end

@implementation ExpoTelebirrPaymentModule

// Expose this module to React Native
RCT_EXPORT_MODULE(ExpoTelebirrPayment);

// Method to retrieve the URL scheme dynamically
- (NSString *)getAppURLScheme {
    NSDictionary *infoDict = [[NSBundle mainBundle] infoDictionary];
    NSArray *urlTypes = infoDict[@"CFBundleURLTypes"];

    if (urlTypes && urlTypes.count > 0) {
        for (NSDictionary *urlTypeDict in urlTypes) {
            NSArray *urlSchemes = urlTypeDict[@"CFBundleURLSchemes"];
            if (urlSchemes && urlSchemes.count > 0) {
                // Look for Telebirr-specific scheme first
                for (NSString *scheme in urlSchemes) {
                    if ([scheme containsString:@"telebirr"] || [scheme isEqualToString:infoDict[@"CFBundleIdentifier"]]) {
                        return scheme;
                    }
                }
                // Fallback to first scheme
                return urlSchemes[0];
            }
        }
    }

    return nil;
}

// Method to validate parameters
- (BOOL)validateParameters:(NSString *)appId 
                 shortCode:(NSString *)shortCode 
                receiveCode:(NSString *)receiveCode 
                    reject:(RCTPromiseRejectBlock)reject {
    
    if (!appId || [appId length] == 0) {
        reject(@"PARAMETER_ERROR", @"appId is required and cannot be empty", nil);
        return NO;
    }
    
    if (!shortCode || [shortCode length] == 0) {
        reject(@"PARAMETER_ERROR", @"shortCode is required and cannot be empty", nil);
        return NO;
    }
    
    if (!receiveCode || [receiveCode length] == 0) {
        reject(@"PARAMETER_ERROR", @"receiveCode is required and cannot be empty", nil);
        return NO;
    }
    
    return YES;
}

// Method to trigger the payment
RCT_EXPORT_METHOD(startPayment:(NSString *)appId
                     shortCode:(NSString *)shortCode
                    receiveCode:(NSString *)receiveCode
                       resolver:(RCTPromiseResolveBlock)resolve
                       rejecter:(RCTPromiseRejectBlock)reject) {
    
    // Validate parameters
    if (![self validateParameters:appId shortCode:shortCode receiveCode:receiveCode reject:reject]) {
        return;
    }
    
    // Get the URL scheme dynamically
    NSString *returnAppScheme = [self getAppURLScheme];
    
    if (!returnAppScheme) {
        reject(@"NO_URL_SCHEME", @"No URL scheme found in Info.plist. Please configure URL schemes in your app configuration.", nil);
        return;
    }

    dispatch_async(dispatch_get_main_queue(), ^{
        self.resolve = resolve;
        self.reject = reject;
        
        NSLog(@"ExpoTelebirrPayment: Starting payment with appId: %@, shortCode: %@", appId, shortCode);
        
        // Initialize EthiopiaPaySDK
        EthiopiaPayManager *manager = [EthiopiaPayManager sharedManager];
        manager.delegate = self;
        
        // Start payment
        [manager startPayWithAppId:[appId stringByTrimmingCharactersInSet:[NSCharacterSet whitespaceCharacterSet]]
                         shortCode:[shortCode stringByTrimmingCharactersInSet:[NSCharacterSet whitespaceCharacterSet]]
                        receiveCode:[receiveCode stringByTrimmingCharactersInSet:[NSCharacterSet whitespaceCharacterSet]]
                    returnAppScheme:returnAppScheme];
    });
}

// Method to check if Telebirr app is installed
RCT_EXPORT_METHOD(isAppInstalled:(RCTPromiseResolveBlock)resolve
                         rejecter:(RCTPromiseRejectBlock)reject) {
    
    dispatch_async(dispatch_get_main_queue(), ^{
        // This is a placeholder - the actual implementation would check if Telebirr app is installed
        // For now, we'll assume it's available
        NSDictionary *result = @{
            @"isInstalled": @YES
        };
        resolve(result);
    });
}

// EthiopiaPayManagerDelegate callback for payment result
- (void)payResultCallbackWithCode:(NSInteger)code msg:(NSString *)msg {
    dispatch_async(dispatch_get_main_queue(), ^{
        NSLog(@"ExpoTelebirrPayment: Payment callback - code: %ld, message: %@", (long)code, msg);
        
        if (self.resolve) {
            NSDictionary *result = @{
                @"code": @(code),
                @"message": msg ?: @"",
                @"timestamp": @([[NSDate date] timeIntervalSince1970] * 1000), // milliseconds
                @"transactionId": code == 0 ? [NSString stringWithFormat:@"success_%ld", (long)[[NSDate date] timeIntervalSince1970]] : [NSNull null]
            };
            self.resolve(result);
        }
        
        // Clean up
        self.resolve = nil;
        self.reject = nil;
    });
}

@end