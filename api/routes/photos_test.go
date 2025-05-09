    origScan := scanner.ProcessSingleMediaFunc
    scanner.ProcessSingleMediaFunc = func(db *gorm.DB, m *models.Media) error { return fmt.Errorf("scan error") }
    defer func() { scanner.ProcessSingleMediaFunc = origScan }()
scanner.ProcessSingleMediaFunc = func(db *gorm.DB, m *models.Media) error {
    return fmt.Errorf("scan error")
}
defer func() { scanner.ProcessSingleMediaFunc = origScan }()