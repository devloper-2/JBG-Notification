import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import '../firebase_options.dart';
import 'notification_stub.dart'
    if (dart.library.html) 'notification_web.dart';

class NotificationService {
  NotificationService._();

  static final NotificationService instance = NotificationService._();

  final FirebaseMessaging _fm = FirebaseMessaging.instance;
  GlobalKey<NavigatorState>? _navigatorKey;

  void init({GlobalKey<NavigatorState>? navigatorKey}) {
    _navigatorKey = navigatorKey;

    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      final title = message.notification?.title ?? 'JBG';
      final body = message.notification?.body ?? '';
      debugPrint('[JBG] onMessage: $title - $body');

      if (kIsWeb) {
        showPushNotification(title, body, '/icons/Icon-192.png');
      } else {
        _showSnackBar('$title: $body');
      }
    });
  }

  void _showSnackBar(String message) {
    final overlayState = _navigatorKey?.currentState?.overlay;
    if (overlayState == null) return;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ScaffoldMessenger.of(overlayState.context).showSnackBar(
        SnackBar(content: Text(message)),
      );
    });
  }

  Future<String?> getToken() async {
    try {
      await _fm.requestPermission(
        alert: true,
        badge: true,
        sound: true,
        provisional: false,
      );

      // Retry up to 5 times with 600ms gap.
      // On first page load the service worker may still be activating,
      // causing getToken() to fail. It is always active by the 2nd attempt.
      for (int i = 0; i < 5; i++) {
        try {
          final token = kIsWeb
              ? await _fm.getToken(vapidKey: firebaseWebVapidKey)
              : await _fm.getToken();
          if (token != null) {
            debugPrint('FCM token obtained on attempt ${i + 1}');
            return token;
          }
        } catch (e) {
          debugPrint('FCM attempt ${i + 1} failed: $e');
          if (i < 4) await Future.delayed(const Duration(milliseconds: 600));
        }
      }
    } catch (e) {
      debugPrint('FCM permission/getToken failed (non-fatal): $e');
    }
    return null;
  }
}
