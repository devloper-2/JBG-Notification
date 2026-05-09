import 'dart:async';
import 'dart:js_interop';

@JS('showPushNotification')
external void _jsFn(JSString title, JSString body, JSString icon);

void showPushNotification(String title, String body, String icon) {
  _jsFn(title.toJS, body.toJS, icon.toJS);
}

// Called from notification_service.dart on all web platforms.
// Delegates the full permission-request + token-generation flow to native JS,
// so it always runs inside (or immediately after) a real user-gesture context.
@JS('window._jbgGetToken')
external JSPromise<JSString?> _jbgGetTokenJS();

Future<String?> getWebToken() async {
  try {
    final result = await _jbgGetTokenJS().toDart;
    return result?.toDart;
  } catch (e) {
    return null;
  }
}
