Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes

$root = [System.Windows.Automation.AutomationElement]::RootElement
$windowCondition = New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::ControlTypeProperty, [System.Windows.Automation.ControlType]::Window)
$buttonCondition = New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::ControlTypeProperty, [System.Windows.Automation.ControlType]::Button)

for ($attempt = 0; $attempt -lt 30; $attempt++) {
  $windows = $root.FindAll([System.Windows.Automation.TreeScope]::Children, $windowCondition)
  foreach ($window in $windows) {
    if ($window.Current.Name -notlike '*Switch Console*') { continue }
    $buttons = $window.FindAll([System.Windows.Automation.TreeScope]::Descendants, $buttonCondition)
    foreach ($button in $buttons) {
      if ($button.Current.Name -ne 'Start' -or -not $button.Current.IsEnabled) { continue }
      try {
        $invoke = $button.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern)
        $invoke.Invoke()
        exit 0
      } catch { }
    }
  }
  Start-Sleep -Seconds 1
}
exit 1
