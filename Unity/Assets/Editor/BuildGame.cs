using System;
using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEditor.Build.Reporting;
using UnityEngine;
using DenTinh.UnityRuntime;

namespace DenTinh.Editor {
    [InitializeOnLoad] public static class BuildGame {
        const string ScenePath="Assets/Scenes/Main.unity";
        static BuildGame(){EditorApplication.delayCall+=PrepareIfNeeded;}
        static void PrepareIfNeeded(){if(!EditorApplication.isPlayingOrWillChangePlaymode&&!File.Exists(ScenePath))Prepare();}
        [MenuItem("Đèn Tinh/Chuẩn bị scene và cấu hình")] public static void Prepare(){
            if(!Directory.Exists("Assets/Scenes"))Directory.CreateDirectory("Assets/Scenes");
            if(!File.Exists(ScenePath)){UnityEngine.SceneManagement.Scene scene=EditorSceneManager.NewScene(NewSceneSetup.EmptyScene,NewSceneMode.Single);new GameObject("Đèn Tinh · Game").AddComponent<DenTinhGame>();EditorSceneManager.SaveScene(scene,ScenePath);}
            EditorBuildSettings.scenes=new[]{new EditorBuildSettingsScene(ScenePath,true)};PlayerSettings.companyName="DenTinh";PlayerSettings.productName="Đèn Tinh - Miền Sương Lạc";PlayerSettings.bundleVersion="0.8.0";PlayerSettings.defaultScreenWidth=1280;PlayerSettings.defaultScreenHeight=720;PlayerSettings.runInBackground=false;PlayerSettings.resizableWindow=true;PlayerSettings.defaultIsNativeResolution=false;PlayerSettings.SetScriptingBackend(UnityEditor.Build.NamedBuildTarget.Standalone,ScriptingImplementation.Mono2x);EditorSettings.serializationMode=SerializationMode.ForceText;AssetDatabase.SaveAssets();
        }
        [MenuItem("Đèn Tinh/Build Windows 64-bit")] public static void BuildWindows(){
            Prepare();Directory.CreateDirectory("Builds/Windows");BuildReport report=BuildPipeline.BuildPlayer(new BuildPlayerOptions{scenes=new[]{ScenePath},locationPathName="Builds/Windows/DenTinh.exe",target=BuildTarget.StandaloneWindows64,options=BuildOptions.None});
            File.WriteAllText("Builds/build-result.txt",report.summary.result+Environment.NewLine+"Errors: "+report.summary.totalErrors+Environment.NewLine+"Size: "+report.summary.totalSize);
            if(report.summary.result!=BuildResult.Succeeded)throw new Exception("Unity build failed: "+report.summary.result);
        }
        [MenuItem("Đèn Tinh/Build WebGL")] public static void BuildWeb(){Prepare();Directory.CreateDirectory("Builds/WebGL");BuildReport report=BuildPipeline.BuildPlayer(new BuildPlayerOptions{scenes=new[]{ScenePath},locationPathName="Builds/WebGL",target=BuildTarget.WebGL,options=BuildOptions.None});if(report.summary.result!=BuildResult.Succeeded)throw new Exception("WebGL build failed: "+report.summary.result);}
    }
    public sealed class PixelTextureImporter : AssetPostprocessor {
        void OnPreprocessTexture(){if(!assetPath.Contains("Resources/Art/"))return;TextureImporter importer=(TextureImporter)assetImporter;importer.textureType=TextureImporterType.Default;importer.filterMode=FilterMode.Point;importer.wrapMode=TextureWrapMode.Clamp;importer.npotScale=TextureImporterNPOTScale.None;importer.mipmapEnabled=false;importer.alphaIsTransparency=true;importer.textureCompression=TextureImporterCompression.Uncompressed;importer.maxTextureSize=8192;importer.isReadable=true;}
    }
}
