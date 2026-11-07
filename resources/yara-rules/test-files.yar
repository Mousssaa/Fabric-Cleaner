// Fabric Cleaner bundled local rule pack: test files.
// Original rules by HakTrak Networks. Rules are never downloaded; this pack is
// compiled locally by YARA-X together with any .yar files the user adds.

rule EICAR_TestFile
{
    meta:
        detectionName = "EICAR.TestFile"
        severity = "low"
        details = "EICAR anti-malware test file. It is harmless and only verifies that detection works."

    strings:
        $eicar = "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*"

    condition:
        $eicar at 0 and filesize < 256
}
