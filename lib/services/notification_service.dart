import 'dart:convert';

import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

/// NotificationService
/// - Handles FCM token retrieval, refresh handling and forwarding tokens to backend.
/// - Also listens to foreground messages and prints/shows them if a navigatorKey is provided.
class NotificationService {
  NotificationService._();

  static final NotificationService instance = NotificationService._();

  final FirebaseMessaging _fm = FirebaseMessaging.instance;
  GlobalKey<NavigatorState>? _navigatorKey;
  String? _lastAccessToken;

  /// Initialize listeners. Pass an optional [navigatorKey] to display dialogs/snackbars.
  void init({GlobalKey<NavigatorState>? navigatorKey}) {
    _navigatorKey = navigatorKey;

    // Listen for foreground messages
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      // Handle foreground messages here. For now, print and show a simple dialog/snack.
      debugPrint('FCM onMessage: ${message.notification?.title} - ${message.notification?.body}');

      if (_navigatorKey?.currentState != null) {
        final overlayState = _navigatorKey!.currentState!.overlay;
        if (overlayState != null) {
          final ctx = overlayState.context;
          final title = message.notification?.title ?? 'Notification';
          final body = message.notification?.body ?? '';

          // Schedule UI work to avoid any sync context issues.
          WidgetsBinding.instance.addPostFrameCallback((_) {
            ScaffoldMessenger.of(ctx).showSnackBar(
              SnackBar(content: Text('$title: $body')),
            );
          });
        }
      }
    });

    // Handle token refreshes
    FirebaseMessaging.instance.onTokenRefresh.listen((newToken) {
      debugPrint('FCM token refreshed: $newToken');
      if (newToken.isNotEmpty) {
        sendTokenToServer(newToken);
      }
    });
  }

  /// Request permission (iOS and Android T+) and get the current FCM token.
  /// If [accessToken] is provided, it's stored and used when calling backend.
  Future<String?> requestPermissionAndGetToken({String? accessToken}) async {
    _lastAccessToken = accessToken;

    // Request permissions (iOS and Android 13+)
    NotificationSettings settings = await _fm.requestPermission(
      alert: true,
      badge: true,
      sound: true,
      provisional: false,
    );

    debugPrint('User granted permission: ${settings.authorizationStatus}');

    // Get the token
    final token = await _fm.getToken();
    debugPrint('FCM token: $token');

    if (token != null && token.isNotEmpty) {
      // Send to your backend
      await sendTokenToServer(token);
    }

    return token;
  }

  /// Send the device token to backend API.
  /// This is a dummy/example implementation; update the endpoint to your real one.
  Future<void> sendTokenToServer(String token) async {
    try {
      debugPrint('Sending token to server: $token');

      // Example endpoint - replace with your real API endpoint
      final uri = Uri.parse('https://api.jbggola.com/api/device-token');

      final headers = <String, String>{
        'Content-Type': 'application/json',
      };

      if (_lastAccessToken != null) {
        headers['Authorization'] = 'Bearer $_lastAccessToken';
      }

      final body = jsonEncode({
        'device_token': token,
        'platform': "flutter",
      });

      // Example POST - you should handle response codes and errors as needed
      final resp = await http.post(uri, headers: headers, body: body).timeout(
            const Duration(seconds: 10),
          );

      if (resp.statusCode >= 200 && resp.statusCode < 300) {
        debugPrint('Token registered on server successfully');
      } else {
        debugPrint('Failed registering token: ${resp.statusCode} ${resp.body}');
      }
    } catch (e, st) {
      debugPrint('Error sending token to server: $e\n$st');
    }
  }
}
