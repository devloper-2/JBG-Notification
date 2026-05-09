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
      if (kIsWeb) {
        // On web, the full permission + token flow runs inside a native JS
        // button click so the user-gesture requirement is met on every browser
        // (iOS WebKit, Android Chrome, desktop). See web/index.html.
        return await getWebToken();
      }

      // Native iOS / Android path.
      await _fm.requestPermission(
        alert: true,
        badge: true,
        sound: true,
        provisional: false,
      );
      return await _fm.getToken();
    } catch (e) {
      debugPrint('FCM getToken failed (non-fatal): $e');
    }
    return null;
  }
}
