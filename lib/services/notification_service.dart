import 'dart:convert';

import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import 'api_service.dart';
import '../firebase_options.dart';

class NotificationService {
  NotificationService._();

  static final NotificationService instance = NotificationService._();

  final FirebaseMessaging _fm = FirebaseMessaging.instance;
  GlobalKey<NavigatorState>? _navigatorKey;

  void init({GlobalKey<NavigatorState>? navigatorKey}) {
    _navigatorKey = navigatorKey;

    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      debugPrint(
        'FCM onMessage: ${message.notification?.title} - ${message.notification?.body}',
      );
      _showSnackBar(
        '${message.notification?.title ?? 'Notification'}: ${message.notification?.body ?? ''}',
      );
    });

    FirebaseMessaging.instance.onTokenRefresh.listen((newToken) {
      debugPrint('FCM token refreshed: $newToken');
      if (newToken.isNotEmpty) {
        sendTokenToServer(newToken);
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

  Future<String?> requestPermissionAndGetToken() async {
    final settings = await _fm.requestPermission(
      alert: true,
      badge: true,
      sound: true,
      provisional: false,
    );

    debugPrint('Notification permission: ${settings.authorizationStatus}');

    String? token;
    if (kIsWeb) {
      token = await _fm.getToken(vapidKey: firebaseWebVapidKey);
    } else {
      token = await _fm.getToken();
    }

    debugPrint('FCM token: $token');

    if (token != null && token.isNotEmpty) {
      await sendTokenToServer(token);
    }

    return token;
  }

  Future<void> sendTokenToServer(String token) async {
    try {
      // Always read the latest token from storage so this works after page refresh
      // and when onTokenRefresh fires outside of a login flow.
      final prefs = await SharedPreferences.getInstance();
      final accessToken = prefs.getString('accessToken');

      if (accessToken == null) {
        debugPrint('Skipping token send — not logged in yet');
        return;
      }

      debugPrint('Sending FCM token to server: $token');

      final uri = Uri.parse('${ApiService.baseUrl}/device-token');
      final resp = await http
          .post(
            uri,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer $accessToken',
            },
            body: jsonEncode({
              'device_token': token,
              'platform': kIsWeb ? 'web' : defaultTargetPlatform.name,
            }),
          )
          .timeout(const Duration(seconds: 10));

      if (resp.statusCode >= 200 && resp.statusCode < 300) {
        debugPrint('FCM token registered on server successfully');
      } else {
        debugPrint('Failed registering token: ${resp.statusCode} ${resp.body}');
      }
    } catch (e, st) {
      debugPrint('Error sending token to server: $e\n$st');
    }
  }
}
