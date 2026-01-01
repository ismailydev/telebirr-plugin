package com.telebirr;

import android.util.Log;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.WritableNativeMap;
import com.huawei.ethiopia.pay.sdk.api.core.data.PayInfo;
import com.huawei.ethiopia.pay.sdk.api.core.utils.PaymentManager;
import com.huawei.ethiopia.pay.sdk.api.core.listener.PayCallback;
import androidx.fragment.app.FragmentActivity;

public class TelebirrPaymentModule extends ReactContextBaseJavaModule {

    private static final String TAG = "ExpoTelebirrPayment";

    public TelebirrPaymentModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        return "ExpoTelebirrPayment";
    }

    @ReactMethod
    public void startPayment(String appId, String shortCode, String receiveCode, Promise promise) {
        try {
            // Validate parameters
            if (appId == null || appId.trim().isEmpty()) {
                promise.reject("PARAMETER_ERROR", "appId is required and cannot be empty");
                return;
            }
            if (shortCode == null || shortCode.trim().isEmpty()) {
                promise.reject("PARAMETER_ERROR", "shortCode is required and cannot be empty");
                return;
            }
            if (receiveCode == null || receiveCode.trim().isEmpty()) {
                promise.reject("PARAMETER_ERROR", "receiveCode is required and cannot be empty");
                return;
            }

            Log.d(TAG, "Starting payment with appId: " + appId + ", shortCode: " + shortCode);

            final PayInfo payInfo = new PayInfo.Builder()
                    .setAppId(appId.trim())
                    .setShortCode(shortCode.trim())
                    .setReceiveCode(receiveCode.trim())
                    .build();

            // Set the PayCallback listener to handle the result
            PaymentManager.getInstance().setPayCallback(new PayCallback() {
                @Override
                public void onPayCallback(int code, String errMsg) {
                    Log.d(TAG, "Payment callback - code: " + code + ", message: " + errMsg);

                    // Create standardized response
                    WritableMap result = new WritableNativeMap();
                    result.putInt("code", code);
                    result.putString("message", errMsg != null ? errMsg : "");
                    result.putDouble("timestamp", System.currentTimeMillis());
                    
                    // Add transaction ID if available (code 0 means success)
                    if (code == 0) {
                        result.putString("transactionId", "success_" + System.currentTimeMillis());
                    }
                    
                    promise.resolve(result);
                }
            });

            if (getCurrentActivity() instanceof FragmentActivity) {
                FragmentActivity activity = (FragmentActivity) getCurrentActivity();
                PaymentManager.getInstance().pay(activity, payInfo);
            } else {
                promise.reject("ACTIVITY_ERROR", "The current activity is not a FragmentActivity. Make sure you're running in a proper React Native context.");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error initiating payment", e);
            promise.reject("PAYMENT_ERROR", "Error initiating payment: " + e.getMessage());
        }
    }

    @ReactMethod
    public void isAppInstalled(Promise promise) {
        try {
            // This is a placeholder - the actual implementation would check if Telebirr app is installed
            // For now, we'll assume it's available
            WritableMap result = new WritableNativeMap();
            result.putBoolean("isInstalled", true);
            promise.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Error checking app installation", e);
            promise.reject("CHECK_ERROR", "Error checking Telebirr app installation: " + e.getMessage());
        }
    }
}
