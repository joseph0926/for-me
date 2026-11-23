// 앱 버전은 시맨틱 버전 하나만 고친다. 올리는 규칙은 README의 버전 절을 따른다.
val appVersion = "0.6.0"

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
    id("com.google.devtools.ksp")
}

android {
    namespace = "dev.forme.video"
    compileSdk = 36
    buildToolsVersion = "36.0.0"

    defaultConfig {
        applicationId = "dev.forme.video"
        minSdk = 26
        targetSdk = 36
        versionCode = semanticVersionCode(appVersion)
        versionName = appVersion
        ndk { abiFilters += listOf("arm64-v8a", "x86_64") }
    }
    buildFeatures {
        compose = true
        buildConfig = true
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    packaging { jniLibs.useLegacyPackaging = false }
    testOptions { unitTests.isIncludeAndroidResources = true }
    lint {
        warningsAsErrors = true
        // 새 버전 출시는 호환성을 검토해 반영하며, 고정된 빌드의 실패 조건으로 삼지 않는다.
        // OldTargetApi도 새 Android 출시 알림이다. 대상 SDK 상향은 AGP와 기기 검증을 함께 묶어 진행한다(QA-010).
        informational += setOf("GradleDependency", "AndroidGradlePluginVersion", "NewerVersionAvailable", "OldTargetApi")
    }
}

kotlin { jvmToolchain(17) }

/**
 * Android는 versionCode가 커져야 업데이트로 설치하므로 주 * 10000 + 부 * 100 + 수로 계산한다.
 * 부와 수가 100 이상이면 다음 자리와 겹쳐 순서가 틀어지므로 빌드를 멈춘다.
 */
fun semanticVersionCode(version: String): Int {
    val match = Regex("""(\d+)\.(\d+)\.(\d+)""").matchEntire(version)
        ?: error("appVersion은 주.부.수 형식이어야 합니다: $version")
    val (major, minor, patch) = match.destructured.toList().map(String::toInt)
    check(minor < 100 && patch < 100) { "부와 수 버전은 99 이하여야 합니다: $version" }
    return major * 10_000 + minor * 100 + patch
}
ksp { arg("room.schemaLocation", "$projectDir/schemas") }

dependencies {
    implementation(platform("androidx.compose:compose-bom:2025.10.01"))
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.ui:ui")
    implementation("androidx.activity:activity-compose:1.11.0")
    implementation("androidx.core:core-ktx:1.17.0")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.9.4")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.9.4")
    implementation("androidx.room:room-runtime:2.8.4")
    ksp("androidx.room:room-compiler:2.8.4")
    implementation("org.videolan.android:libvlc-all:3.7.7")

    testImplementation("junit:junit:4.13.2")
    testImplementation("org.robolectric:robolectric:4.16.1")
    testImplementation("androidx.test:core:1.7.0")
    testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.10.2")
}
