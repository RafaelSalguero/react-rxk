Set-Variable -Name registry -Value (npm get registry)
npm set registry https://registry.npmjs.org/
npm publish
npm set registry (Get-Variable -Name registry -ValueOnly )