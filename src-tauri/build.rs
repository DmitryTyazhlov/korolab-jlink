fn main() {
    let out_dir = std::env::var("OUT_DIR").unwrap();
    println!("cargo:rustc-env=OUT_DIR={}", out_dir);
    tauri_build::build()
}
