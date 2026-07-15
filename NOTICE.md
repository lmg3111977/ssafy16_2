# Data notice

This service uses data supplied from the Korea Tourism Organization TourAPI 4.0 Korean tourism information service.

- Region: Seoul
- Content type: Festivals, performances, and events
- Provider: Korea Tourism Organization
- Original public-data API: https://www.data.go.kr/data/15101578/openapi.do
- License: Korea Open Government License Type 3 (attribution + no modification)
- License details: https://www.kogl.or.kr/info/licenseTypeView.do?licenseType=3

The data archive in this repository is a lossless gzip/base64 representation of the supplied source JSON. `npm install` or `npm run restore:data` restores the exact JSON bytes used by the application. Runtime search and display formatting do not overwrite the source values.
