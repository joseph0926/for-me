// 앱 버전은 시맨틱 버전 하나만 고친다. 올리는 규칙은 README의 버전 절을 따른다.
val appVersion = "0.1.0"

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
}

android {
    namespace = "dev.forme.gallery"
    compileSdk = 36
    // 정하지 않으면 AGP가 SDK에 다른 Build-Tools를 자동 설치한다(음악 앱 2026-11-28 검증 기록).
    buildToolsVersion = "36.0.0"

    defaultConfig {
        // 출시 뒤 바꾸지 않는다(2026-11-28 사용자 결정, docs/research.md#개발-스택).
        applicationId = "dev.forme.gallery"
        // 부분 허용(READ_MEDIA_VISUAL_USER_SELECTED)이 있는 Android 14부터 지원한다.
        minSdk = 34
        targetSdk = 36
        versionCode = semanticVersionCode(appVersion)
        versionName = appVersion
    }
    buildFeatures {
        compose = true
        buildConfig = true
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    lint {
        warningsAsErrors = true
        // 새 버전 출시 알림은 고정된 빌드의 실패 조건으로 삼지 않는다. 대상 SDK 상향은 기기 검증과 함께 진행한다.
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

dependencies {
    implementation(platform("androidx.compose:compose-bom:2025.10.01"))
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.ui:ui")
    implementation("androidx.activity:activity-compose:1.11.0")
    implementation("androidx.core:core-ktx:1.17.0")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.9.4")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.9.4")

    testImplementation("junit:junit:4.13.2")
}
