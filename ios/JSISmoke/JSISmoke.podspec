Pod::Spec.new do |s|
  s.name         = 'JSISmoke'
  s.version      = '0.0.1'
  s.summary      = 'Minimal JSI smoke test (auto-installs)'
  s.source       = { :path => '.' }
  s.platform     = :ios, '13.0'
  s.source_files = '**/*.{h,mm}'
  s.requires_arc = true
  s.pod_target_xcconfig = {
    'CLANG_CXX_LANGUAGE_STANDARD' => 'c++17',
    'CLANG_CXX_LIBRARY' => 'libc++'
  }
  s.dependency 'React-Core'
end
