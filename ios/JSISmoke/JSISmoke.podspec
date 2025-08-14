# ios/JSISmoke/JSISmoke.podspec
Pod::Spec.new do |s|
  s.name         = 'JSISmoke'
  s.version      = '0.0.1'
  s.summary      = 'Minimal JSI Test'
  s.description  = 'A JSI test module for ALAN ios.'
  s.homepage     = 'https://andrewtho5942.xyz'
  s.license      = { :type => 'MIT' }               
  s.authors      = { 'Andrew Thompson' => 'andrewtho5942@gmail.com' } 
  s.platform     = :ios, '13.0'
  s.requires_arc = true
  s.source       = { :git => 'https://github.com/Andrewtho5942/ALAN_ios', :tag => s.version.to_s }
  s.source_files = '**/*.{h,mm}'
  s.pod_target_xcconfig = {
    'CLANG_CXX_LANGUAGE_STANDARD' => 'c++17',
    'CLANG_CXX_LIBRARY' => 'libc++'
  }
  s.dependency 'React-Core'
  s.dependency 'React-cxxreact' 
end
