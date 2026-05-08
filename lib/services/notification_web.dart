import 'dart:js_interop';

@JS('showPushNotification')
external void _jsFn(JSString title, JSString body, JSString icon);

void showPushNotification(String title, String body, String icon) {
  _jsFn(title.toJS, body.toJS, icon.toJS);
}
