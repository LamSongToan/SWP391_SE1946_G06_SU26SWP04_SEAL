param(
    [string]$InputPath = "C:\Users\nem\Documents\stitch.html",
    [string]$OutputRoot = "C:\Users\nem\Desktop\my-project\SWP391_SE1946_G06_SU26SWP04_SEAL\seal-hackathon\frontend\stitch-material"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $InputPath)) {
    throw "Input file not found: $InputPath"
}

$raw = Get-Content -LiteralPath $InputPath -Raw
if ([string]::IsNullOrWhiteSpace($raw)) {
    throw "Input file is empty: $InputPath"
}

$docs = [regex]::Split($raw, '(?=<!DOCTYPE html>)') | Where-Object {
    $trimmed = $_.TrimStart()
    $trimmed.StartsWith('<!DOCTYPE html>')
}
if ($docs.Count -eq 0) {
    throw "No HTML documents found in input"
}

$pagesDir = Join-Path $OutputRoot "pages"
$stylesDir = Join-Path $OutputRoot "styles"
New-Item -ItemType Directory -Force -Path $pagesDir | Out-Null
New-Item -ItemType Directory -Force -Path $stylesDir | Out-Null

$styleMap = @{}
$styleRules = New-Object System.Collections.Generic.List[string]
$globalExtractedStyles = New-Object System.Collections.Generic.List[string]
$styleCounter = 1
$pageFiles = New-Object System.Collections.Generic.List[string]

function Get-Slug([string]$text, [int]$index) {
    $clean = [regex]::Replace($text.ToLowerInvariant(), '[^a-z0-9]+', '-').Trim('-')
    if ([string]::IsNullOrWhiteSpace($clean)) {
        return ("page-{0:d2}" -f $index)
    }
    return ("{0:d2}-{1}" -f $index, $clean)
}

function Normalize-Style([string]$styleValue) {
    $parts = @($styleValue.Split(';') | ForEach-Object { $_.Trim() } | Where-Object { $_.Length -gt 0 })
    if ($parts.Count -eq 0) {
        return ""
    }
    return (($parts -join '; ') + ';')
}

function Get-StyleClass([string]$normalizedStyle) {
    if ($styleMap.ContainsKey($normalizedStyle)) {
        return $styleMap[$normalizedStyle]
    }
    $className = ("sx-{0:d4}" -f $styleCounter)
    $styleCounter++
    $styleMap[$normalizedStyle] = $className
    $styleRules.Add(".$className { $normalizedStyle }")
    return $className
}

for ($i = 0; $i -lt $docs.Count; $i++) {
    $docIndex = $i + 1
    $doc = $docs[$i]

    $titleMatch = [regex]::Match($doc, '(?is)<title>(.*?)</title>')
    $title = if ($titleMatch.Success) { $titleMatch.Groups[1].Value.Trim() } else { "SEAL Page $docIndex" }
    $slug = Get-Slug -text $title -index $docIndex
    $pageFile = Join-Path $pagesDir "$slug.html"

    $styleMatches = [regex]::Matches($doc, '(?is)<style[^>]*>(.*?)</style>')
    $docExtractedStyles = New-Object System.Collections.Generic.List[string]
    foreach ($m in $styleMatches) {
        $css = $m.Groups[1].Value.Trim()
        if ($css.Length -gt 0) {
            $docExtractedStyles.Add($css)
            $globalExtractedStyles.Add($css)
        }
    }
    $doc = [regex]::Replace($doc, '(?is)<style[^>]*>.*?</style>', '')

    # Remove duplicate Material Symbols links inside same page head.
    $matLinkPattern = '(?is)<link[^>]*Material\+Symbols\+Outlined[^>]*>'
    $matLinks = [regex]::Matches($doc, $matLinkPattern)
    if ($matLinks.Count -gt 1) {
        $linkSeen = 0
        $doc = [regex]::Replace($doc, $matLinkPattern, {
            param($match)
            if ($linkSeen -eq 0) {
                $linkSeen = 1
                return $match.Value
            }
            return ""
        })
    }

    # Convert inline style="" to generated classes in external CSS.
    $tagPattern = '<(?<tag>[a-zA-Z][a-zA-Z0-9:-]*)(?<attrs>(?:[^"''<>]|"[^"]*"|''[^'']*'')*)(?<selfclose>\s*/?)>'
    $doc = [regex]::Replace($doc, $tagPattern, {
        param($m)
        $tagName = $m.Groups["tag"].Value
        $attrs = $m.Groups["attrs"].Value
        $selfclose = $m.Groups["selfclose"].Value

        if ($attrs -notmatch '\sstyle\s*=\s*"[^"]*"') {
            return $m.Value
        }

        $styleMatch = [regex]::Match($attrs, '\sstyle\s*=\s*"(?<style>[^"]*)"')
        if (-not $styleMatch.Success) {
            return $m.Value
        }

        $normalizedStyle = Normalize-Style $styleMatch.Groups["style"].Value
        if ([string]::IsNullOrWhiteSpace($normalizedStyle)) {
            $attrs = [regex]::Replace($attrs, '\sstyle\s*=\s*"[^"]*"', '')
            return "<$tagName$attrs$selfclose>"
        }

        $generatedClass = Get-StyleClass $normalizedStyle
        $attrsNoStyle = [regex]::Replace($attrs, '\sstyle\s*=\s*"[^"]*"', '')

        if ($attrsNoStyle -match '\sclass\s*=\s*"(?<cls>[^"]*)"') {
            $attrsNoStyle = [regex]::Replace(
                $attrsNoStyle,
                '\sclass\s*=\s*"(?<cls>[^"]*)"',
                {
                    param($classMatch)
                    $existing = $classMatch.Groups["cls"].Value.Trim()
                    if ($existing.Length -eq 0) {
                        return " class=""$generatedClass"""
                    }
                    return " class=""$existing $generatedClass"""
                },
                1
            )
        } else {
            $attrsNoStyle = "$attrsNoStyle class=""$generatedClass"""
        }

        return "<$tagName$attrsNoStyle$selfclose>"
    })

    # Ensure shared stylesheet is linked.
    if ($doc -match '(?is)</head>') {
        $stylesheetLink = '<link rel="stylesheet" href="../styles/seal-material.css">'
        if ($doc -notmatch [regex]::Escape($stylesheetLink)) {
            $doc = [regex]::Replace($doc, '(?is)</head>', "$stylesheetLink`r`n</head>", 1)
        }
    }

    Set-Content -LiteralPath $pageFile -Value $doc -Encoding UTF8
    $pageFiles.Add($pageFile)
}

$materialBaseCss = @'
/* Material-inspired shared theme for SEAL pages */
:root {
  --mui-font: "Inter", "Roboto", "Helvetica", "Arial", sans-serif;
  --mui-primary: #6750a4;
  --mui-on-primary: #ffffff;
  --mui-secondary: #625b71;
  --mui-surface: #fffbfe;
  --mui-surface-container: #f3edf7;
  --mui-outline: #79747e;
  --mui-on-surface: #1c1b1f;
  --mui-error: #b3261e;
}

*,
*::before,
*::after {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
  font-family: var(--mui-font);
  color: var(--mui-on-surface);
  background: var(--mui-surface);
  line-height: 1.5;
}

button,
input,
select,
textarea {
  font: inherit;
}

button {
  border-radius: 8px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: background-color 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

button:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

a {
  color: var(--mui-primary);
}

.error {
  color: var(--mui-error);
}
'@

$sharedInlineCss = ($styleRules -join "`r`n")
$extractedCss = ($globalExtractedStyles | Select-Object -Unique) -join "`r`n`r`n"
$fullCss = @(
    $materialBaseCss
    ""
    "/* Auto-generated from inline style=""..."" attributes */"
    $sharedInlineCss
    ""
    "/* Extracted from original <style> blocks */"
    $extractedCss
) -join "`r`n"

$cssFile = Join-Path $stylesDir "seal-material.css"
Set-Content -LiteralPath $cssFile -Value $fullCss -Encoding UTF8

$summary = @"
Converted input: $InputPath
Output root: $OutputRoot
Pages generated: $($pageFiles.Count)
Unique inline styles moved to CSS: $($styleMap.Count)
Shared stylesheet: $cssFile
"@

$summaryFile = Join-Path $OutputRoot "README-conversion.txt"
Set-Content -LiteralPath $summaryFile -Value $summary -Encoding UTF8

Write-Output $summary
