const { withAndroidManifest, withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

const providerSource = `package com.myday.taskwidget;

import com.myday.R;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.File;
import java.io.ByteArrayOutputStream;
import java.io.FileInputStream;
import java.nio.charset.StandardCharsets;

public class TaskWidgetProvider extends AppWidgetProvider {
  private static final String SNAPSHOT_FILE = "task-widget.json";

  @Override
  public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
    for (int id : ids) updateWidget(context, manager, id);
  }

  @Override
  public void onAppWidgetOptionsChanged(Context context, AppWidgetManager manager, int id, android.os.Bundle options) {
    updateWidget(context, manager, id);
  }

  private static void updateWidget(Context context, AppWidgetManager manager, int id) {
    RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.task_widget);
    JSONObject snapshot = readSnapshot(context);
    String date = snapshot != null ? snapshot.optString("date", "") : "";
    int pending = snapshot != null ? snapshot.optInt("pendingCount", 0) : 0;
    views.setTextViewText(R.id.widget_title, "Today's Tasks");
    views.setTextViewText(R.id.widget_date, date);
    views.setTextViewText(R.id.widget_count, pending + " belum selesai");

    JSONArray tasks = snapshot != null ? snapshot.optJSONArray("tasks") : null;
    int[] itemIds = { R.id.widget_task_1, R.id.widget_task_2, R.id.widget_task_3, R.id.widget_task_4, R.id.widget_task_5 };
    for (int index = 0; index < itemIds.length; index++) {
      if (tasks != null && index < tasks.length()) {
        JSONObject task = tasks.optJSONObject(index);
        String prefix = task != null && task.optInt("completed", 0) == 1 ? "✓ " : "• ";
        views.setTextViewText(itemIds[index], prefix + (task == null ? "" : task.optString("title", "Task")));
        views.setViewVisibility(itemIds[index], View.VISIBLE);
      } else {
        views.setViewVisibility(itemIds[index], View.GONE);
      }
    }
    if (tasks == null || tasks.length() == 0) {
      views.setTextViewText(R.id.widget_task_1, "Tidak ada tugas hari ini");
      views.setViewVisibility(R.id.widget_task_1, View.VISIBLE);
    }

    Intent launchIntent = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
    if (launchIntent != null) {
      launchIntent.setData(Uri.parse("myday:///(tabs)/tasks"));
      PendingIntent pendingIntent = PendingIntent.getActivity(context, 9001, launchIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
      views.setOnClickPendingIntent(R.id.widget_root, pendingIntent);
    }
    manager.updateAppWidget(id, views);
  }

  private static JSONObject readSnapshot(Context context) {
    try {
      File file = new File(context.getFilesDir(), SNAPSHOT_FILE);
      if (!file.exists()) return null;
      FileInputStream input = new FileInputStream(file);
      ByteArrayOutputStream output = new ByteArrayOutputStream();
      byte[] buffer = new byte[1024];
      int read;
      while ((read = input.read(buffer)) != -1) output.write(buffer, 0, read);
      input.close();
      String json = new String(output.toByteArray(), StandardCharsets.UTF_8);
      return new JSONObject(json);
    } catch (Exception ignored) {
      return null;
    }
  }
}
`;

const layoutXml = `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/widget_root"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:padding="16dp"
    android:background="@drawable/task_widget_background">
    <TextView android:id="@+id/widget_title" android:layout_width="match_parent" android:layout_height="wrap_content" android:text="Today's Tasks" android:textColor="#FFFFFF" android:textSize="18sp" android:textStyle="bold" />
    <TextView android:id="@+id/widget_date" android:layout_width="match_parent" android:layout_height="wrap_content" android:layout_marginTop="3dp" android:textColor="#DCD9FF" android:textSize="12sp" />
    <TextView android:id="@+id/widget_count" android:layout_width="match_parent" android:layout_height="wrap_content" android:layout_marginTop="10dp" android:textColor="#FFFFFF" android:textSize="12sp" />
    <TextView android:id="@+id/widget_task_1" android:layout_width="match_parent" android:layout_height="wrap_content" android:layout_marginTop="10dp" android:ellipsize="end" android:maxLines="1" android:textColor="#FFFFFF" android:textSize="13sp" />
    <TextView android:id="@+id/widget_task_2" android:layout_width="match_parent" android:layout_height="wrap_content" android:layout_marginTop="6dp" android:ellipsize="end" android:maxLines="1" android:textColor="#FFFFFF" android:textSize="13sp" />
    <TextView android:id="@+id/widget_task_3" android:layout_width="match_parent" android:layout_height="wrap_content" android:layout_marginTop="6dp" android:ellipsize="end" android:maxLines="1" android:textColor="#FFFFFF" android:textSize="13sp" />
    <TextView android:id="@+id/widget_task_4" android:layout_width="match_parent" android:layout_height="wrap_content" android:layout_marginTop="6dp" android:ellipsize="end" android:maxLines="1" android:textColor="#FFFFFF" android:textSize="13sp" />
    <TextView android:id="@+id/widget_task_5" android:layout_width="match_parent" android:layout_height="wrap_content" android:layout_marginTop="6dp" android:ellipsize="end" android:maxLines="1" android:textColor="#FFFFFF" android:textSize="13sp" />
</LinearLayout>`;

const infoXml = `<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="180dp"
    android:minHeight="110dp"
    android:updatePeriodMillis="1800000"
    android:initialLayout="@layout/task_widget"
    android:resizeMode="horizontal|vertical"
    android:widgetCategory="home_screen" />`;

const backgroundXml = `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <solid android:color="#292D47" />
    <corners android:radius="20dp" />
</shape>`;

function writeFile(filePath, contents) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents);
}

module.exports = function withTaskWidget(config) {
  config = withAndroidManifest(config, (config) => {
    const application = config.modResults.manifest.application?.[0];
    if (!application) return config;
    application.receiver = application.receiver || [];
    const name = ".taskwidget.TaskWidgetProvider";
    if (!application.receiver.some((receiver) => receiver.$?.["android:name"] === name)) {
      application.receiver.push({
        $: { "android:name": name, "android:exported": "true" },
        "intent-filter": [{ action: [{ $: { "android:name": "android.appwidget.action.APPWIDGET_UPDATE" } }] }],
        "meta-data": [{ $: { "android:name": "android.appwidget.provider", "android:resource": "@xml/task_widget_info" } }],
      });
    }
    return config;
  });

  return withDangerousMod(config, ["android", async (config) => {
    const root = config.modRequest.platformProjectRoot;
    writeFile(path.join(root, "app/src/main/java/com/myday/taskwidget/TaskWidgetProvider.java"), providerSource);
    writeFile(path.join(root, "app/src/main/res/layout/task_widget.xml"), layoutXml);
    writeFile(path.join(root, "app/src/main/res/xml/task_widget_info.xml"), infoXml);
    writeFile(path.join(root, "app/src/main/res/drawable/task_widget_background.xml"), backgroundXml);
    return config;
  }]);
};
