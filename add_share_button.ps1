$filePath = "app/(tabs)/exercise-activity-detail.tsx"
$content = Get-Content $filePath -Raw -Encoding UTF8

# Add share button before bottomSpacer
$shareButton = @"

        {/* Botón Compartir */}
        <TouchableOpacity
          style={styles.shareButton}
          onPress={() => {
            router.push({
              pathname: '/(tabs)/share-cardio',
              params: { exerciseId: exerciseId }
            } as any);
          }}
        >
          <Ionicons name="share-outline" size={20} color="#0a0a0a" />
          <Text style={styles.shareButtonText}>{t('common.share')}</Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
"@

$content = $content -replace '        <View style=\{styles\.bottomSpacer\} />', $shareButton

# Add styles before bottomSpacer style
$newStyles = @"
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFD54A',
    marginHorizontal: 16,
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0a0a0a',
  },
  bottomSpacer: {
"@

$content = $content -replace '  bottomSpacer: \{', $newStyles

$content | Set-Content $filePath -Encoding UTF8 -NoNewline

Write-Host "Share button added successfully!"
