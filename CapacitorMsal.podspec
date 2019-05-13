
  Pod::Spec.new do |s|
    s.name = 'CapacitorMsal'
    s.version = '0.0.1'
    s.summary = 'A Capacitor plugin that provides OAuth 2.0 authentication using the Microsoft Authentication Library'
    s.license = 'MIT'
    s.homepage = 'https://github.com/911-Secure/capacitor-msal'
    s.author = '911 Secure'
    s.source = { :git => 'https://github.com/911-Secure/capacitor-msal', :tag => s.version.to_s }
    s.source_files = 'ios/Plugin/**/*.{swift,h,m,c,cc,mm,cpp}'
    s.ios.deployment_target  = '11.0'
    s.dependency 'Capacitor'
  end