import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart'
    show defaultTargetPlatform, kIsWeb, TargetPlatform;

class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    if (kIsWeb) {
      return web;
    }
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;
      case TargetPlatform.iOS:
        return ios;
      default:
        throw UnsupportedError(
          'DefaultFirebaseOptions are not configured for this platform.',
        );
    }
  }

  static const FirebaseOptions web = FirebaseOptions(
    apiKey: 'AIzaSyDxYURwnQj3z0OmDd-huEIX1w_UnxnY1oc',
    appId: '1:441380081715:web:28657c6b6755604136d346',
    messagingSenderId: '441380081715',
    projectId: 'jgb-codezpark',
    authDomain: 'jgb-codezpark.firebaseapp.com',
    storageBucket: 'jgb-codezpark.firebasestorage.app',
    measurementId: 'G-K3M4FZCY1P',
  );

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyBHKENqH_IZZ_KXNtAB5rsWECc9nFcAa0E',
    appId: '1:441380081715:android:4d6200b6db21eb9a36d346',
    messagingSenderId: '441380081715',
    projectId: 'jgb-codezpark',
    storageBucket: 'jgb-codezpark.firebasestorage.app',
  );

  // iOS config — fill in from Firebase Console → Project Settings → Your apps → iOS app
  // If you don't have an iOS native app registered, add one and download GoogleService-Info.plist
  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: 'REPLACE_WITH_IOS_API_KEY',
    appId: 'REPLACE_WITH_IOS_APP_ID',
    messagingSenderId: '441380081715',
    projectId: 'jgb-codezpark',
    storageBucket: 'jgb-codezpark.firebasestorage.app',
    iosBundleId: 'com.example.jbgNotification',
  );
}

const String firebaseWebVapidKey =
    'BL7wtWV0SrcznOLOiglS1o42Ty6g03OuimhisbgpIaRv6R6TAJiWoiJQpqcZ6Ovl9EChMbcjLR7Br6SUUHhSGyw';
