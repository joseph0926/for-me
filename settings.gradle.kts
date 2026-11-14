pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "for-me"

// 앱마다 apps/<앱>/<플랫폼> 폴더를 쓴다. 폴더 이름(android)이 앱끼리 겹치므로
// Gradle 프로젝트 이름은 <앱>-<플랫폼>으로 따로 정한다.
include(":video-android")
project(":video-android").projectDir = file("apps/video/android")
