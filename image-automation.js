// image-automation.js - Fixed lightbox initialization

const imageCollections = {
    headshots: {
        folder: 'images/headshots/',
        thumbFolder: 'images/headshots/thumbs/',
        images: [
            'headshot-dramatic-style-artist-poet.jpg',
            'headshot-professional-executive-team-studio-lighting-1.jpg',
            'headshot-professional-executive-team-studio-lighting-2.jpg',
            'headshot-professional-executive-team-studio-lighting-3.jpg',
            'headshot-professional-executive-team-studio-lighting-4.jpg',
            'headshot-professional-executive-team-studio-lighting-5.jpg',
            'headshot-professional-executive-team-studio-lighting-6.jpg',
            'headshot-professional-executive-team-studio-lighting-7.jpg',
            'headshot-professional-executive-team-studio-lighting-8.jpg',
            'headshot-professional-executive-team-studio-lighting-9.jpg',
            'headshot-natural-environment-professional-1.jpg',
            'headshot-natural-environment-professional-2.jpg',
            'headshot-natural-environment-professional-3.jpg',
            'headshot-natural-environment-professional-4.jpg',
            'headshot-natural-environment-professional-5.jpg',
            'headshot-natural-environment-professional-6.jpg',
            'headshot-natural-environment-professional-7.jpg',
            'headshot-natural-environment-professional-8.jpg'
        ],
        thumbnails: [
            'headshot-dramatic-style-artist-poet-thumb.jpg',
            'headshot-professional-executive-team-studio-lighting-thumb-1.jpg',
            'headshot-professional-executive-team-studio-lighting-thumb-2.jpg',
            'headshot-professional-executive-team-studio-lighting-thumb-3.jpg',
            'headshot-professional-executive-team-studio-lighting-thumb-4.jpg',
            'headshot-professional-executive-team-studio-lighting-thumb-5.jpg',
            'headshot-professional-executive-team-studio-lighting-thumb-6.jpg',
            'headshot-professional-executive-team-studio-lighting-thumb-7.jpg',
            'headshot-professional-executive-team-studio-lighting-thumb-8.jpg',
            'headshot-professional-executive-team-studio-lighting-thumb-9.jpg',
            'headshot-natural-environment-professional-thumb-1.jpg',
            'headshot-natural-environment-professional-thumb-2.jpg',
            'headshot-natural-environment-professional-thumb-3.jpg',
            'headshot-natural-environment-professional-thumb-4.jpg',
            'headshot-natural-environment-professional-thumb-5.jpg',
            'headshot-natural-environment-professional-thumb-6.jpg',
            'headshot-natural-environment-professional-thumb-7.jpg',
            'headshot-natural-environment-professional-thumb-8.jpg'
        ],
        alts: [
            'Professional headshot photography featuring headshot dramatic style artist poet',
            'Professional headshot photography featuring headshot professional executive team studio lighting',
            'Professional headshot photography featuring headshot professional executive team studio lighting',
            'Professional headshot photography featuring headshot professional executive team studio lighting',
            'Professional headshot photography featuring headshot professional executive team studio lighting',
            'Professional headshot photography featuring headshot professional executive team studio lighting',
            'Professional headshot photography featuring headshot professional executive team studio lighting',
            'Professional headshot photography featuring headshot professional executive team studio lighting',
            'Professional headshot photography featuring headshot professional executive team studio lighting',
            'Professional headshot photography featuring headshot professional executive team studio lighting',
            'Professional headshot photography featuring headshot natural environment professional',
            'Professional headshot photography featuring headshot natural environment professional',
            'Professional headshot photography featuring headshot natural environment professional',
            'Professional headshot photography featuring headshot natural environment professional',
            'Professional headshot photography featuring headshot natural environment professional',
            'Professional headshot photography featuring headshot natural environment professional',
            'Professional headshot photography featuring headshot natural environment professional',
            'Professional headshot photography featuring headshot natural environment professional'
        ],
        thumbAlts: [
            'Professional headshot photography featuring headshot dramatic style artist poet thumb',
            'Professional headshot photography featuring headshot professional executive team studio lighting thumb',
            'Professional headshot photography featuring headshot professional executive team studio lighting thumb',
            'Professional headshot photography featuring headshot professional executive team studio lighting thumb',
            'Professional headshot photography featuring headshot professional executive team studio lighting thumb',
            'Professional headshot photography featuring headshot professional executive team studio lighting thumb',
            'Professional headshot photography featuring headshot professional executive team studio lighting thumb',
            'Professional headshot photography featuring headshot professional executive team studio lighting thumb',
            'Professional headshot photography featuring headshot professional executive team studio lighting thumb',
            'Professional headshot photography featuring headshot professional executive team studio lighting thumb',
            'Professional headshot photography featuring headshot natural environment professional thumb',
            'Professional headshot photography featuring headshot natural environment professional thumb',
            'Professional headshot photography featuring headshot natural environment professional thumb',
            'Professional headshot photography featuring headshot natural environment professional thumb',
            'Professional headshot photography featuring headshot natural environment professional thumb',
            'Professional headshot photography featuring headshot natural environment professional thumb',
            'Professional headshot photography featuring headshot natural environment professional thumb',
            'Professional headshot photography featuring headshot natural environment professional thumb'
        ]
    },
    architecture: {
        folder: 'images/architecture/',
        thumbFolder: 'images/architecture/thumbs/',
        images: [
            'haight-street-victorian-family-kitchen-interior-1.jpg',
            'haight-street-victorian-family-kitchen-interior-2.jpg',
            'haight-street-victorian-family-room-interior-1.jpg',
            'haight-street-victorian-family-room-interior-2.jpg',
            'haight-street-victorian-family-room-interior-3.jpg',
            'haight-street-victorian-modern-bathroom-interior.jpg',
            'woodside-vineyard-estate-bedroom-interior.jpg',
            'woodside-vineyard-estate-brick-veranda-exterior-1.jpg',
            'woodside-vineyard-estate-brick-veranda-exterior-2.jpg',
            'woodside-vineyard-estate-brick-veranda-exterior-3.jpg',
            'woodside-vineyard-estate-exterior-1.jpg',
            'woodside-vineyard-estate-kitchen-interior-1.jpg',
            'woodside-vineyard-estate-kitchen-interior-2.jpg',
            'woodside-vineyard-estate-living-room-interior-1.jpg',
            'woodside-vineyard-estate-living-room-interior-2.jpg',
            'woodside-vineyard-estate-living-room-interior-3.jpg',
            'woodside-vineyard-estate-master-bathroom-interior-1.jpg',
            'woodside-vineyard-estate-master-bathroom-interior-2.jpg',
            'woodside-vineyard-estate-master-bathroom-interior-3.jpg',
            'woodside-vineyard-estate-master-bathroom-interior-4.jpg',
            'woodside-vineyard-estate-master-bathroom-interior-5.jpg',
            'woodside-vineyard-estate-master-bedroom-interior-1.jpg',
            'woodside-vineyard-estate-master-bedroom-interior-2.jpg',
            'woodside-vineyard-estate-master-bedroom-interior-3.jpg'
        ],
        thumbnails: [
            'haight-street-victorian-family-kitchen-interior-1-thumb.jpg',
            'haight-street-victorian-family-kitchen-interior-2-thumb.jpg',
            'haight-street-victorian-family-room-interior-1-thumb.jpg',
            'haight-street-victorian-family-room-interior-2-thumb.jpg',
            'haight-street-victorian-family-room-interior-3-thumb.jpg',
            'haight-street-victorian-modern-bathroom-interior-thumb.jpg',
            'woodside-vineyard-estate-bedroom-interior-thumb.jpg',
            'woodside-vineyard-estate-brick-veranda-exterior-1-thumb.jpg',
            'woodside-vineyard-estate-brick-veranda-exterior-2-thumb.jpg',
            'woodside-vineyard-estate-brick-veranda-exterior-3-thumb.jpg',
            'woodside-vineyard-estate-exterior-1-thumb.jpg',
            'woodside-vineyard-estate-kitchen-interior-1-thumb.jpg',
            'woodside-vineyard-estate-kitchen-interior-2-thumb.jpg',
            'woodside-vineyard-estate-living-room-interior-1-thumb.jpg',
            'woodside-vineyard-estate-living-room-interior-2-thumb.jpg',
            'woodside-vineyard-estate-living-room-interior-3-thumb.jpg',
            'woodside-vineyard-estate-master-bathroom-interior-1-thumb.jpg',
            'woodside-vineyard-estate-master-bathroom-interior-2-thumb.jpg',
            'woodside-vineyard-estate-master-bathroom-interior-3-thumb.jpg',
            'woodside-vineyard-estate-master-bathroom-interior-4-thumb.jpg',
            'woodside-vineyard-estate-master-bathroom-interior-5-thumb.jpg',
            'woodside-vineyard-estate-master-bedroom-interior-1-thumb.jpg',
            'woodside-vineyard-estate-master-bedroom-interior-2-thumb.jpg',
            'woodside-vineyard-estate-master-bedroom-interior-3-thumb.jpg'
        ],
        alts: [
            'Architectural photography featuring haight street victorian kitchen interior',
            'Architectural photography featuring haight street victorian kitchen interior',
            'Architectural photography featuring haight street victorian family room interior',
            'Architectural photography featuring haight street victorian family room interior',
            'Architectural photography featuring haight street victorian family room interior',
            'Architectural photography featuring haight street victorian modern bathroom interior',
            'Architectural photography featuring woodside vineyard estate bedroom interior',
            'Architectural photography featuring woodside vineyard estate brick veranda exterior',
            'Architectural photography featuring woodside vineyard estate brick veranda exterior',
            'Architectural photography featuring woodside vineyard estate brick veranda exterior',
            'Architectural photography featuring woodside vineyard estate exterior',
            'Architectural photography featuring woodside vineyard estate kitchen interior',
            'Architectural photography featuring woodside vineyard estate kitchen interior',
            'Architectural photography featuring woodside vineyard estate living room interior',
            'Architectural photography featuring woodside vineyard estate living room interior',
            'Architectural photography featuring woodside vineyard estate living room interior',
            'Architectural photography featuring woodside vineyard estate master bathroom interior',
            'Architectural photography featuring woodside vineyard estate master bathroom interior',
            'Architectural photography featuring woodside vineyard estate master bathroom interior',
            'Architectural photography featuring woodside vineyard estate master bathroom interior',
            'Architectural photography featuring woodside vineyard estate master bathroom interior',
            'Architectural photography featuring woodside vineyard estate master bedroom interior',
            'Architectural photography featuring woodside vineyard estate master bedroom interior',
            'Architectural photography featuring woodside vineyard estate master bedroom interior'
        ],
        thumbAlts: [
            'Architectural photography featuring haight street victorian family kitchen interior thumbnail',
            'Architectural photography featuring haight street victorian family kitchen interior thumbnail',
            'Architectural photography featuring haight street victorian family room interior thumbnail',
            'Architectural photography featuring haight street victorian family room interior thumbnail',
            'Architectural photography featuring haight street victorian family room interior thumbnail',
            'Architectural photography featuring haight street victorian modern bathroom interior thumbnail',
            'Architectural photography featuring woodside vineyard estate bedroom interior thumbnail',
            'Architectural photography featuring woodside vineyard estate brick veranda exterior thumbnail',
            'Architectural photography featuring woodside vineyard estate brick veranda exterior thumbnail',
            'Architectural photography featuring woodside vineyard estate brick veranda exterior thumbnail',
            'Architectural photography featuring woodside vineyard estate exterior thumbnail',
            'Architectural photography featuring woodside vineyard estate kitchen interior thumbnail',
            'Architectural photography featuring woodside vineyard estate kitchen interior thumbnail',
            'Architectural photography featuring woodside vineyard estate living room interior thumbnail',
            'Architectural photography featuring woodside vineyard estate living room interior thumbnail',
            'Architectural photography featuring woodside vineyard estate living room interior thumbnail',
            'Architectural photography featuring woodside vineyard estate master bathroom interior thumbnail',
            'Architectural photography featuring woodside vineyard estate master bathroom interior thumbnail',
            'Architectural photography featuring woodside vineyard estate master bathroom interior thumbnail',
            'Architectural photography featuring woodside vineyard estate master bathroom interior thumbnail',
            'Architectural photography featuring woodside vineyard estate master bathroom interior thumbnail',
            'Architectural photography featuring woodside vineyard estate master bedroom interior thumbnail',
            'Architectural photography featuring woodside vineyard estate master bedroom interior thumbnail',
            'Architectural photography featuring woodside vineyard estate master bedroom interior thumbnail'
        ]
    },
    automotive: {
        folder: 'images/automotive/',
        thumbFolder: 'images/automotive/thumbs/',
        images: [
            '1962-Chevrolet-Corvette-Exterior-front-drivers-side-quarter.jpg',
            '1971-chevrolet-k10-cheyenne-super-exterior-detail-passenger-side-mirror.jpg',
            '1971-chevrolet-k10-cheyenne-super-exterior-drivers-side-front-quarter.jpg',
            '1971-chevrolet-k10-cheyenne-super-interior-drivers-side-steering-wheel-detail-2.jpg',
            '1971-chevrolet-k10-cheyenne-super-interior-drivers-side-steering-wheel-detail.jpg',
            '1973-Alfa-Romeo-GTV-2000-exterior-top-down-view.jpg',
            '1974-Ducati-750-Sport-exterior-detail-tail-light.jpg',
            '1974-Ducati-750-Sport-exterior-front-quarter.jpg',
            '1974-Ducati-750-Sport-exterior-profile.jpg',
            '1974-Ducati-750-Sport-exterior-rear.jpg',
            '1974-Morgan-4x4-exterior-drivers-side-profile.jpg',
            '1974-Morgan-4x4-exterior-front-drivers-side-quarter.jpg',
            '1974-Morgan-4x4-exterior-interior-steering-wheel.jpg',
            '1980-Porsche-911-SC-Exterior-passenger-side-profile.jpg',
            '1980-Porsche-911-SC-interior-drivers-side-wide.jpg',
            '1988-Porsche-911-Carrera-Coupe-exterior-drivers-side-front-quarter.jpg',
            '1988-Porsche-911-Carrera-Coupe-exterior-rear.jpg',
            '1988-Porsche-911-Carrera-Coupe-passenger-exterior-side-profile.jpg',
            '1995-Mercedes-Benz-E280- AMG-exterior-front-passenger-side-quarter.jpg',
            '2016-Mazda-MX-5-Miata-exterior-passenger-side-low-angle-wheel.jpg',
            '2016-Mazda-MX-5-Miata-exterior-passenger-side-profile-high-angle.jpg',
            '2016-Mazda-MX-5-Miata-exterior-passenger-side-profile.jpg',
            '2016-Mazda-MX-5-Miata-exterior-passenger-side-rear-quarter.jpg',
            '2016-Mazda-MX-5-Miata-exterior-rear.jpg',
            '2016-Mazda-MX-5-Miata-interior-drivers-side-steering-wheel-detail.jpg',
            '2016-Mazda-MX-5-Miata-Interior-wide-dash.jpg',
            '2016-Porsche-Cayman-exterior-drivers-side-profile.jpg',
            '2016-Porsche-Cayman-exterior-passenger-side-front-quarter.jpg',
            '2017-porsche-911-targa-4S-exterior-passengers-side-profile.jpg',
            '2017-porsche-911-targa-4S-interior-drivers-side-wide.jpg',
            '2018-Mercedes-Benz-AMG-GT-R-V8-BITurbo-Exterior-drivers-side-front-quarter.jpg',
            '2018-Mercedes-Benz-AMG-GT-R-V8-BITurbo-Exterior-drivers-side-profile.jpg',
            '2023-Lamborghini-Huracan-STO-Exterior-drivers-side-front-quarter-low-angle.jpg',
            '2023-Lamborghini-Huracan-STO-Exterior-drivers-side-tail-light-detail.jpg',
            '2023-Lamborghini-Huracan-STO-Exterior-front.jpg',
            '2023-Lamborghini-Huracan-STO-Exterior-passenger-side-profile-front-quarter.jpg',
            '2023-Lamborghini-Huracan-STO-interior-center-console-top-down.jpg',
            '2023-Lamborghini-Huracan-STO-interior-drivers-side-wide.jpg',
            '2024-Tesla-Cybertruck-Beast-Foundation-Series-exterior-passenger-side-front-quarter-low-angle.jpg',
            '2024-Tesla-Cybertruck-Beast-Foundation-Series-exterior-top-down.jpg',
            '2024-Tesla-Cybertruck-Beast-Foundation-Series-interior-drivers-side-wide.jpg'
        ],
        thumbnails: [
            '1962-Chevrolet-Corvette-Exterior-front-drivers-side-quarter-thumb.jpg',
            '1971-chevrolet-k10-cheyenne-super-exterior-detail-passenger-side-mirror-thumb.jpg',
            '1971-chevrolet-k10-cheyenne-super-exterior-drivers-side-front-quarter-thumb.jpg',
            '1971-chevrolet-k10-cheyenne-super-interior-drivers-side-steering-wheel-detail-2-thumb.jpg',
            '1971-chevrolet-k10-cheyenne-super-interior-drivers-side-steering-wheel-detail-thumb.jpg',
            '1973-Alfa-Romeo-GTV-2000-exterior-top-down-view-thumb.jpg',
            '1974-Ducati-750-Sport-exterior-detail-tail-light-thumb.jpg',
            '1974-Ducati-750-Sport-exterior-front-quarter-thumb.jpg',
            '1974-Ducati-750-Sport-exterior-profile-thumb.jpg',
            '1974-Ducati-750-Sport-exterior-rear-thumb.jpg',
            '1974-Morgan-4x4-exterior-drivers-side-profile-thumb.jpg',
            '1974-Morgan-4x4-exterior-front-drivers-side-quarter-thumb.jpg',
            '1974-Morgan-4x4-exterior-interior-steering-wheel-thumb.jpg',
            '1980-Porsche-911-SC-Exterior-passenger-side-profile-thumb.jpg',
            '1980-Porsche-911-SC-interior-drivers-side-wide-thumb.jpg',
            '1988-Porsche-911-Carrera-Coupe-exterior-drivers-side-front-quarter-thumb.jpg',
            '1988-Porsche-911-Carrera-Coupe-exterior-rear-thumb.jpg',
            '1988-Porsche-911-Carrera-Coupe-passenger-exterior-side-profile-thumb.jpg',
            '1995-Mercedes-Benz-E280- AMG-exterior-front-passenger-side-quarter-thumb.jpg',
            '2016-Mazda-MX-5-Miata-exterior-passenger-side-low-angle-wheel-thumb.jpg',
            '2016-Mazda-MX-5-Miata-exterior-passenger-side-profile-high-angle-thumb.jpg',
            '2016-Mazda-MX-5-Miata-exterior-passenger-side-profile-thumb.jpg',
            '2016-Mazda-MX-5-Miata-exterior-passenger-side-rear-quarter-thumb.jpg',
            '2016-Mazda-MX-5-Miata-exterior-rear-thumb.jpg',
            '2016-Mazda-MX-5-Miata-interior-drivers-side-steering-wheel-detail-thumb.jpg',
            '2016-Mazda-MX-5-Miata-Interior-wide-dash-thumb.jpg',
            '2016-Porsche-Cayman-exterior-drivers-side-profile-thumb.jpg',
            '2016-Porsche-Cayman-exterior-passenger-side-front-quarter-thumb.jpg',
            '2017-porsche-911-targa-4S-exterior-passengers-side-profile-thumb.jpg',
            '2017-porsche-911-targa-4S-interior-drivers-side-wide-thumb.jpg',
            '2018-Mercedes-Benz-AMG-GT-R-V8-BITurbo-Exterior-drivers-side-front-quarter-thumb.jpg',
            '2018-Mercedes-Benz-AMG-GT-R-V8-BITurbo-Exterior-drivers-side-profile-thumb.jpg',
            '2023-Lamborghini-Huracan-STO-Exterior-drivers-side-front-quarter-low-angle-thumb.jpg',
            '2023-Lamborghini-Huracan-STO-Exterior-drivers-side-tail-light-detail-thumb.jpg',
            '2023-Lamborghini-Huracan-STO-Exterior-front-thumb.jpg',
            '2023-Lamborghini-Huracan-STO-Exterior-passenger-side-profile-front-quarter-thumb.jpg',
            '2023-Lamborghini-Huracan-STO-interior-center-console-top-down-thumb.jpg',
            '2023-Lamborghini-Huracan-STO-interior-drivers-side-wide-thumb.jpg',
            '2024-Tesla-Cybertruck-Beast-Foundation-Series-exterior-passenger-side-front-quarter-low-angle-thumb.jpg',
            '2024-Tesla-Cybertruck-Beast-Foundation-Series-exterior-top-down-thumb.jpg',
            '2024-Tesla-Cybertruck-Beast-Foundation-Series-interior-drivers-side-wide-thumb.jpg'
        ],
        alts: [
            'Automotive photography featuring 1962 Chevrolet Corvette exterior front driver’s side quarter',
            'Automotive photography featuring 1971 Chevrolet K10 Cheyenne Super exterior detail passenger side mirror',
            'Automotive photography featuring 1971 Chevrolet K10 Cheyenne Super exterior driver’s side front quarter',
            'Automotive photography featuring 1971 Chevrolet K10 Cheyenne Super interior driver’s side steering wheel detail',
            'Automotive photography featuring 1971 Chevrolet K10 Cheyenne Super interior driver’s side steering wheel detail',
            'Automotive photography featuring 1973 Alfa Romeo GTV 2000 exterior top down view',
            'Automotive photography featuring 1974 Ducati 750 Sport exterior detail tail light',
            'Automotive photography featuring 1974 Ducati 750 Sport exterior front quarter',
            'Automotive photography featuring 1974 Ducati 750 Sport exterior profile',
            'Automotive photography featuring 1974 Ducati 750 Sport exterior rear',
            'Automotive photography featuring 1974 Morgan 4x4 exterior driver’s side profile',
            'Automotive photography featuring 1974 Morgan 4x4 exterior front driver’s side quarter',
            'Automotive photography featuring 1974 Morgan 4x4 interior steering wheel',
            'Automotive photography featuring 1980 Porsche 911 SC exterior passenger side profile',
            'Automotive photography featuring 1980 Porsche 911 SC interior driver’s side wide angle',
            'Automotive photography featuring 1988 Porsche 911 Carrera Coupe exterior driver’s side front quarter',
            'Automotive photography featuring 1988 Porsche 911 Carrera Coupe exterior rear',
            'Automotive photography featuring 1988 Porsche 911 Carrera Coupe passenger exterior side profile',
            'Automotive photography featuring 1995 Mercedes-Benz E280 AMG exterior front passenger side quarter',
            'Automotive photography featuring 2016 Mazda MX-5 Miata exterior passenger side low angle wheel',
            'Automotive photography featuring 2016 Mazda MX-5 Miata exterior passenger side profile high angle',
            'Automotive photography featuring 2016 Mazda MX-5 Miata exterior passenger side profile',
            'Automotive photography featuring 2016 Mazda MX-5 Miata exterior passenger side rear quarter',
            'Automotive photography featuring 2016 Mazda MX-5 Miata exterior rear',
            'Automotive photography featuring 2016 Mazda MX-5 Miata interior driver’s side steering wheel detail',
            'Automotive photography featuring 2016 Mazda MX-5 Miata interior wide dash',
            'Automotive photography featuring 2016 Porsche Cayman exterior driver’s side profile',
            'Automotive photography featuring 2016 Porsche Cayman exterior passenger side front quarter',
            'Automotive photography featuring 2017 Porsche 911 Targa 4S exterior passenger’s side profile',
            'Automotive photography featuring 2017 Porsche 911 Targa 4S interior driver’s side wide angle',
            'Automotive photography featuring 2018 Mercedes-Benz AMG GT R V8 BiTurbo exterior driver’s side front quarter',
            'Automotive photography featuring 2018 Mercedes-Benz AMG GT R V8 BiTurbo exterior driver’s side profile',
            'Automotive photography featuring 2023 Lamborghini Huracán STO exterior driver’s side front quarter low angle',
            'Automotive photography featuring 2023 Lamborghini Huracán STO exterior driver’s side tail light detail',
            'Automotive photography featuring 2023 Lamborghini Huracán STO exterior front view',
            'Automotive photography featuring 2023 Lamborghini Huracán STO exterior passenger side profile front quarter',
            'Automotive photography featuring 2023 Lamborghini Huracán STO interior center console top down',
            'Automotive photography featuring 2023 Lamborghini Huracán STO interior driver’s side wide angle',
            'Automotive photography featuring 2024 Tesla Cybertruck Beast Foundation Series exterior passenger side front quarter low angle',
            'Automotive photography featuring 2024 Tesla Cybertruck Beast Foundation Series exterior top down view',
            'Automotive photography featuring 2024 Tesla Cybertruck Beast Foundation Series interior driver’s side wide angle'
        ],
        thumbAlts: [
            'Automotive photography featuring 1962 Chevrolet Corvette exterior front driver’s side quarter',
            'Automotive photography featuring 1971 Chevrolet K10 Cheyenne Super exterior detail passenger side mirror',
            'Automotive photography featuring 1971 Chevrolet K10 Cheyenne Super exterior driver’s side front quarter',
            'Automotive photography featuring 1971 Chevrolet K10 Cheyenne Super interior driver’s side steering wheel detail',
            'Automotive photography featuring 1971 Chevrolet K10 Cheyenne Super interior driver’s side steering wheel detail',
            'Automotive photography featuring 1973 Alfa Romeo GTV 2000 exterior top down view',
            'Automotive photography featuring 1974 Ducati 750 Sport exterior detail tail light',
            'Automotive photography featuring 1974 Ducati 750 Sport exterior front quarter',
            'Automotive photography featuring 1974 Ducati 750 Sport exterior profile',
            'Automotive photography featuring 1974 Ducati 750 Sport exterior rear',
            'Automotive photography featuring 1974 Morgan 4x4 exterior driver’s side profile',
            'Automotive photography featuring 1974 Morgan 4x4 exterior front driver’s side quarter',
            'Automotive photography featuring 1974 Morgan 4x4 interior steering wheel',
            'Automotive photography featuring 1980 Porsche 911 SC exterior passenger side profile',
            'Automotive photography featuring 1980 Porsche 911 SC interior driver’s side wide angle',
            'Automotive photography featuring 1988 Porsche 911 Carrera Coupe exterior driver’s side front quarter',
            'Automotive photography featuring 1988 Porsche 911 Carrera Coupe exterior rear',
            'Automotive photography featuring 1988 Porsche 911 Carrera Coupe passenger exterior side profile',
            'Automotive photography featuring 1995 Mercedes-Benz E280 AMG exterior front passenger side quarter',
            'Automotive photography featuring 2016 Mazda MX-5 Miata exterior passenger side low angle wheel',
            'Automotive photography featuring 2016 Mazda MX-5 Miata exterior passenger side profile high angle',
            'Automotive photography featuring 2016 Mazda MX-5 Miata exterior passenger side profile',
            'Automotive photography featuring 2016 Mazda MX-5 Miata exterior passenger side rear quarter',
            'Automotive photography featuring 2016 Mazda MX-5 Miata exterior rear',
            'Automotive photography featuring 2016 Mazda MX-5 Miata interior driver’s side steering wheel detail',
            'Automotive photography featuring 2016 Mazda MX-5 Miata interior wide dash',
            'Automotive photography featuring 2016 Porsche Cayman exterior driver’s side profile',
            'Automotive photography featuring 2016 Porsche Cayman exterior passenger side front quarter',
            'Automotive photography featuring 2017 Porsche 911 Targa 4S exterior passenger’s side profile',
            'Automotive photography featuring 2017 Porsche 911 Targa 4S interior driver’s side wide angle',
            'Automotive photography featuring 2018 Mercedes-Benz AMG GT R V8 BiTurbo exterior driver’s side front quarter',
            'Automotive photography featuring 2018 Mercedes-Benz AMG GT R V8 BiTurbo exterior driver’s side profile',
            'Automotive photography featuring 2023 Lamborghini Huracán STO exterior driver’s side front quarter low angle',
            'Automotive photography featuring 2023 Lamborghini Huracán STO exterior driver’s side tail light detail',
            'Automotive photography featuring 2023 Lamborghini Huracán STO exterior front view',
            'Automotive photography featuring 2023 Lamborghini Huracán STO exterior passenger side profile front quarter',
            'Automotive photography featuring 2023 Lamborghini Huracán STO interior center console top down',
            'Automotive photography featuring 2023 Lamborghini Huracán STO interior driver’s side wide angle',
            'Automotive photography featuring 2024 Tesla Cybertruck Beast Foundation Series exterior passenger side front quarter low angle',
            'Automotive photography featuring 2024 Tesla Cybertruck Beast Foundation Series exterior top down view',
            'Automotive photography featuring 2024 Tesla Cybertruck Beast Foundation Series interior driver’s side wide angle'
        ]
    },
    landscape: {
        folder: 'images/landscape/',
        thumbFolder: 'images/landscape/thumbs/',
        images: [
            'Landscape-Photography-Cliff-House-San-Francisco-Aerial.jpg',
            'Landscape-Photography-Cliff-House-San-Francisco-Top-Down-View.jpg',
            'Landscape-Photography-El-Capitan-Yosemite-California-1.jpg',
            'Landscape-Photography-El-Capitan-Yosemite-California-2.jpg',
            'Landscape-Photography-Half-Dome-Yosemite-California.jpg',
            'Landscape-Photography-San-Francisco-California-1.jpg',
            'Landscape-Photography-San-Francisco-California-2.jpg',
            'Landscape-Photography-San-Gregorio-Beach-California-Sunset.jpg',
            'Landscape-Photography-Shark-Fin-Cove-California-1.jpg',
            'Landscape-Photography-Shark-Fin-Cove-California-2.jpg',
            'Landscape-Photography-Shark-Fin-Cove-California-3.jpg',
            'Landscape-Photography-Shark-Fin-Cove-California-4.jpg',
            'Landscape-Photography-Thorton-Beach Sunset-Aerial.jpg',
            'Landscape-Photography-Valley-Forest-Yosemite-California-1.jpg',
            'Landscape-Photography-Valley-Forest-Yosemite-California-2.jpg'
        ],
        thumbnails: [
            'Landscape-Photography-Cliff-House-San-Francisco-Aerial-thumb.jpg',
            'Landscape-Photography-Cliff-House-San-Francisco-Top-Down-View-thumb.jpg',
            'Landscape-Photography-El-Capitan-Yosemite-California-1-thumb.jpg',
            'Landscape-Photography-El-Capitan-Yosemite-California-2-thumb.jpg',
            'Landscape-Photography-Half-Dome-Yosemite-California-thumb.jpg',
            'Landscape-Photography-San-Francisco-California-1-thumb.jpg',
            'Landscape-Photography-San-Francisco-California-2-thumb.jpg',
            'Landscape-Photography-San-Gregorio-Beach-California-Sunset-thumb.jpg',
            'Landscape-Photography-Shark-Fin-Cove-California-1-thumb.jpg',
            'Landscape-Photography-Shark-Fin-Cove-California-2-thumb.jpg',
            'Landscape-Photography-Shark-Fin-Cove-California-3-thumb.jpg',
            'Landscape-Photography-Shark-Fin-Cove-California-4-thumb.jpg',
            'Landscape-Photography-Thorton-Beach Sunset-Aerial-thumb.jpg',
            'Landscape-Photography-Valley-Forest-Yosemite-California-1-thumb.jpg',
            'Landscape-Photography-Valley-Forest-Yosemite-California-2-thumb.jpg'
        ],
        alts: [
            'Landscape photography featuring Cliff House San Francisco Aerial',
            'Landscape photography featuring Cliff House San Francisco Top Down View',
            'Landscape photography featuring El Capitan Yosemite California',
            'Landscape photography featuring El Capitan Yosemite California',
            'Landscape photography featuring Half Dome Yosemite California',
            'Landscape photography featuring San Francisco California',
            'Landscape photography featuring San Francisco California',
            'Landscape photography featuring San Gregorio Beach California Sunset',
            'Landscape photography featuring Shark Fin Cove California',
            'Landscape photography featuring Shark Fin Cove California',
            'Landscape photography featuring Shark Fin Cove California',
            'Landscape photography featuring Shark Fin Cove California',
            'Landscape photography featuring Thorton Beach Sunset Aerial',
            'Landscape photography featuring Valley Forest Yosemite California',
            'Landscape photography featuring Valley Forest Yosemite California'
        ],
        thumbAlts: [
            'Landscape photography featuring Cliff House San Francisco Aerial',
            'Landscape photography featuring Cliff House San Francisco Top Down View',
            'Landscape photography featuring El Capitan Yosemite California',
            'Landscape photography featuring El Capitan Yosemite California',
            'Landscape photography featuring Half Dome Yosemite California',
            'Landscape photography featuring San Francisco California',
            'Landscape photography featuring San Francisco California',
            'Landscape photography featuring San Gregorio Beach California Sunset',
            'Landscape photography featuring Shark Fin Cove California',
            'Landscape photography featuring Shark Fin Cove California',
            'Landscape photography featuring Shark Fin Cove California',
            'Landscape photography featuring Shark Fin Cove California',
            'Landscape photography featuring Thorton Beach Sunset Aerial',
            'Landscape photography featuring Valley Forest Yosemite California',
            'Landscape photography featuring Valley Forest Yosemite California'
        ]
    },
    engagement: {
        folder: 'images/engagement-couples/',
        thumbFolder: 'images/engagement-couples/thumbs/',
        images: [
            'Engagement-couples-china-town-san-francisco-1.jpg',
            'Engagement-couples-china-town-san-francisco-2.jpg',
            'Engagement-couples-china-town-san-francisco-3.jpg',
            'Engagement-couples-china-town-san-francisco-4.jpg',
            'Engagement-couples-china-town-san-francisco-5.jpg',
            'Engagement-couples-china-town-san-francisco-6.jpg',
            'Engagement-couples-china-town-san-francisco-7.jpg',
            'Engagement-couples-golden-gate-park-san-francisco-1.jpg',
            'Engagement-couples-golden-gate-park-san-francisco-2.jpg',
            'Engagement-couples-golden-gate-park-san-francisco-3.jpg',
            'Engagement-couples-golden-gate-park-san-francisco-4.jpg',
            'Engagement-couples-golden-gate-park-san-francisco-5.jpg',
            'Engagement-couples-golden-gate-park-san-francisco-6.jpg',
            'Engagement-couples-golden-gate-park-san-francisco-7.jpg',
            'Engagement-couples-golden-gate-park-san-francisco-8.jpg',
            'Engagement-couples-golden-gate-park-san-francisco-9.jpg',
            'Engagement-couples-golden-gate-park-san-francisco-10.jpg',
            'Engagement-couples-golden-gate-park-san-francisco-11.jpg',
            'Engagement-couples-golden-gate-park-san-francisco-12.jpg'
        ],
        thumbnails: [
            'Engagement-couples-china-town-san-francisco-1-thumb.jpg',
            'Engagement-couples-china-town-san-francisco-2-thumb.jpg',
            'Engagement-couples-china-town-san-francisco-3-thumb.jpg',
            'Engagement-couples-china-town-san-francisco-4-thumb.jpg',
            'Engagement-couples-china-town-san-francisco-5-thumb.jpg',
            'Engagement-couples-china-town-san-francisco-6-thumb.jpg',
            'Engagement-couples-china-town-san-francisco-7-thumb.jpg',
            'Engagement-couples-golden-gate-park-san-francisco-1-thumb.jpg',
            'Engagement-couples-golden-gate-park-san-francisco-2-thumb.jpg',
            'Engagement-couples-golden-gate-park-san-francisco-3-thumb.jpg',
            'Engagement-couples-golden-gate-park-san-francisco-4-thumb.jpg',
            'Engagement-couples-golden-gate-park-san-francisco-5-thumb.jpg',
            'Engagement-couples-golden-gate-park-san-francisco-6-thumb.jpg',
            'Engagement-couples-golden-gate-park-san-francisco-7-thumb.jpg',
            'Engagement-couples-golden-gate-park-san-francisco-8-thumb.jpg',
            'Engagement-couples-golden-gate-park-san-francisco-9-thumb.jpg',
            'Engagement-couples-golden-gate-park-san-francisco-10-thumb.jpg',
            'Engagement-couples-golden-gate-park-san-francisco-11-thumb.jpg',
            'Engagement-couples-golden-gate-park-san-francisco-12-thumb.jpg'
        ],
        alts: [
            'Engagement photography featuring couples in china town san francisco',
            'Engagement photography featuring couples in china town san francisco',
            'Engagement photography featuring couples in china town san francisco',
            'Engagement photography featuring couples in china town san francisco',
            'Engagement photography featuring couples in china town san francisco',
            'Engagement photography featuring couples in china town san francisco',
            'Engagement photography featuring couples in china town san francisco',
            'Engagement photography featuring couples in golden gate park san francisco',
            'Engagement photography featuring couples in golden gate park san francisco',
            'Engagement photography featuring couples in golden gate park san francisco',
            'Engagement photography featuring couples in golden gate park san francisco',
            'Engagement photography featuring couples in golden gate park san francisco',
            'Engagement photography featuring couples in golden gate park san francisco',
            'Engagement photography featuring couples in golden gate park san francisco',
            'Engagement photography featuring couples in golden gate park san francisco',
            'Engagement photography featuring couples in golden gate park san francisco',
            'Engagement photography featuring couples in golden gate park san francisco',
            'Engagement photography featuring couples in golden gate park san francisco',
            'Engagement photography featuring couples in golden gate park san francisco'
        ],
        thumbAlts: [
            'Engagement photography featuring couples in china town san francisco',
            'Engagement photography featuring couples in china town san francisco',
            'Engagement photography featuring couples in china town san francisco',
            'Engagement photography featuring couples in china town san francisco',
            'Engagement photography featuring couples in china town san francisco',
            'Engagement photography featuring couples in china town san francisco',
            'Engagement photography featuring couples in china town san francisco',
            'Engagement photography featuring couples in golden gate park san francisco',
            'Engagement photography featuring couples in golden gate park san francisco',
            'Engagement photography featuring couples in golden gate park san francisco',
            'Engagement photography featuring couples in golden gate park san francisco',
            'Engagement photography featuring couples in golden gate park san francisco',
            'Engagement photography featuring couples in golden gate park san francisco',
            'Engagement photography featuring couples in golden gate park san francisco',
            'Engagement photography featuring couples in golden gate park san francisco',
            'Engagement photography featuring couples in golden gate park san francisco',
            'Engagement photography featuring couples in golden gate park san francisco',
            'Engagement photography featuring couples in golden gate park san francisco',
            'Engagement photography featuring couples in golden gate park san francisco'
        ]
    },
    portraits: {
        folder: 'images/portraits/',
        thumbFolder: 'images/portraits/thumbs/',
        images: [
            'Outdoor-Portrait-Bride-Model-Beach-California-1.jpg',
            'Outdoor-Portrait-Bride-Model-Beach-California-2.jpg',
            'Outdoor-Portrait-Bride-Model-Beach-California-3.jpg',
            'Outdoor-Portrait-Bride-Model-Beach-California-4.jpg',
            'Outdoor-Portrait-Poet-Berkeley-California.jpg',
            'Outdoor-Portrait-Yoga-Vasquez-Rocks-1.jpg',
            'Outdoor-Portrait-Yoga-Vasquez-Rocks-2.jpg',
            'Outdoor-Portrait-Yoga-Vasquez-Rocks-3.jpg',
            'Sunset-Outdoor-Portrait-California-Coast.jpg'
        ],
        thumbnails: [
            'Outdoor-Portrait-Bride-Model-Beach-California-1-thumb.jpg',
            'Outdoor-Portrait-Bride-Model-Beach-California-2-thumb.jpg',
            'Outdoor-Portrait-Bride-Model-Beach-California-3-thumb.jpg',
            'Outdoor-Portrait-Bride-Model-Beach-California-4-thumb.jpg',
            'Outdoor-Portrait-Poet-Berkeley-California-thumb.jpg',
            'Outdoor-Portrait-Yoga-Vasquez-Rocks-1-thumb.jpg',
            'Outdoor-Portrait-Yoga-Vasquez-Rocks-2-thumb.jpg',
            'Outdoor-Portrait-Yoga-Vasquez-Rocks-3-thumb.jpg',
            'Sunset-Outdoor-Portrait-California-Coast-thumb.jpg'
        ],
        alts: [
            'Portrait photography featuring Outdoor Bride Model Beach California',
            'Portrait photography featuring Outdoor Bride Model Beach California',
            'Portrait photography featuring Outdoor Bride Model Beach California',
            'Portrait photography featuring Outdoor Bride Model Beach California',
            'Portrait photography featuring Outdoor Poet Berkeley California',
            'Portrait photography featuring Outdoor Yoga Vasquez Rocks',
            'Portrait photography featuring Outdoor Yoga Vasquez Rocks',
            'Portrait photography featuring Outdoor Yoga Vasquez Rocks',
            'Portrait photography featuring Sunset Outdoor California Coast'
        ],
        thumbAlts: [
            'Portrait photography featuring Outdoor Bride Model Beach California',
            'Portrait photography featuring Outdoor Bride Model Beach California',
            'Portrait photography featuring Outdoor Bride Model Beach California',
            'Portrait photography featuring Outdoor Bride Model Beach California',
            'Portrait photography featuring Outdoor Poet Berkeley California',
            'Portrait photography featuring Outdoor Yoga Vasquez Rocks',
            'Portrait photography featuring Outdoor Yoga Vasquez Rocks',
            'Portrait photography featuring Outdoor Yoga Vasquez Rocks',
            'Portrait photography featuring Sunset Outdoor California Coast'
        ]
    },
    realestate: {
        folder: 'images/real-estate/',
        thumbFolder: 'images/real-estate/thumbs/',
        images: [
            'real-estate-001.jpg',
            'real-estate-002.jpg',
            'real-estate-003.jpg',
            'real-estate-004.jpg',
            'real-estate-005.jpg',
            'real-estate-006.jpg',
            'real-estate-007.jpg',
            'real-estate-008.jpg'
        ],
        thumbnails: [
            'real-estate-001-thumb.jpg',
            'real-estate-002-thumb.jpg',
            'real-estate-003-thumb.jpg',
            'real-estate-004-thumb.jpg',
            'real-estate-005-thumb.jpg',
            'real-estate-006-thumb.jpg',
            'real-estate-007-thumb.jpg',
            'real-estate-008-thumb.jpg'
        ],
        alts: [
            'Real estate photography featuring luxury home exterior',
            'Real estate photography featuring modern kitchen interior',
            'Real estate photography featuring spacious living room',
            'Real estate photography featuring master bedroom suite',
            'Real estate photography featuring elegant bathroom design',
            'Real estate photography featuring outdoor entertainment area',
            'Real estate photography featuring architectural details',
            'Real estate photography featuring property landscape'
        ],
        thumbAlts: [
            'Real estate photography featuring luxury home exterior thumbnail',
            'Real estate photography featuring modern kitchen interior thumbnail',
            'Real estate photography featuring spacious living room thumbnail',
            'Real estate photography featuring master bedroom suite thumbnail',
            'Real estate photography featuring elegant bathroom design thumbnail',
            'Real estate photography featuring outdoor entertainment area thumbnail',
            'Real estate photography featuring architectural details thumbnail',
            'Real estate photography featuring property landscape thumbnail'
        ]
    }
};

// =============================================================================
// RANDOM SHUFFLING FUNCTIONALITY - NEW FEATURE
// =============================================================================

/**
 * Get or increment page load counter for shuffle timing
 */
function getPageLoadCounter(category) {
    const key = `gallery_loads_${category}`;
    let count = parseInt(localStorage.getItem(key) || '0');
    count++;
    localStorage.setItem(key, count.toString());
    return count;
}

/**
 * Generate a seeded random number for consistent shuffling per cycle
 */
function seededRandom(seed) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
}

/**
 * Fisher-Yates shuffle with optional seed for consistency
 */
function shuffleArray(array, seed = null) {
    const shuffled = [...array];
    const random = seed ? () => seededRandom(seed++) : Math.random;
    
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

/**
 * Get shuffle seed based on load count - changes every 3 loads
 */
function getShuffleSeed(category) {
    const loadCount = getPageLoadCounter(category);
    const cycle = Math.floor((loadCount - 1) / 3); // 0, 1, 2 loads = cycle 0; 3, 4, 5 = cycle 1, etc.
    
    // Create a seed that's consistent for each 3-load cycle
    const baseSeed = category.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return baseSeed + cycle * 1000;
}

/**
 * Shuffle image arrays keeping them synchronized
 */
function shuffleImageCollection(collection, category) {
    const seed = getShuffleSeed(category);
    const indices = Array.from({ length: collection.images.length }, (_, i) => i);
    const shuffledIndices = shuffleArray(indices, seed);
    
    return {
        ...collection,
        images: shuffledIndices.map(i => collection.images[i]),
        thumbnails: shuffledIndices.map(i => collection.thumbnails[i]),
        alts: shuffledIndices.map(i => collection.alts[i]),
        thumbAlts: shuffledIndices.map(i => collection.thumbAlts[i])
    };
}

/**
 * Manually shuffle the current gallery (useful for testing)
 */
function manualShuffle(category) {
    // Force a new shuffle by incrementing cycle
    const key = `gallery_loads_${category}`;
    const currentCount = parseInt(localStorage.getItem(key) || '0');
    const nextCycleStart = Math.ceil((currentCount + 1) / 3) * 3;
    localStorage.setItem(key, nextCycleStart.toString());
    
    // Regenerate gallery
    initializeGalleryAutomation();
    console.log('🔀 Manual shuffle triggered!');
}

// =============================================================================
// GALLERY POPULATION FUNCTIONS (Enhanced with Shuffling)
// =============================================================================

/**
 * Function to populate gallery data (compatible with existing gallery.js)
 */
function populateGallery(category, shouldShuffle = true) {
    let collection = imageCollections[category];
    if (!collection) return [];
    
    // Shuffle the collection if requested
    if (shouldShuffle) {
        collection = shuffleImageCollection(collection, category);
    }
    
    return collection.images.map((image, index) => ({
        src: collection.folder + image,
        thumbnail: collection.thumbFolder + collection.thumbnails[index],
        alt: collection.alts[index] || `${category} photography ${index + 1}`,
        thumbAlt: collection.thumbAlts[index] || `${category} photography thumbnail ${index + 1}`
    }));
}

/**
 * Function to generate gallery HTML with thumbnails and shuffling
 */
function generateGalleryHTML(category, containerId = 'gallery-container') {
    const images = populateGallery(category);
    const container = document.getElementById(containerId);
    
    if (!container || !images.length) {
        console.warn(`Gallery container '${containerId}' not found or no images for category '${category}'`);
        return;
    }
    
    // CRITICAL: Set the global array for lightbox (full-size images)
    window.galleryImages = images.map(img => ({
        src: img.src,  // Full-size image for lightbox
        alt: img.alt   // Full alt text for lightbox
    }));
    
    // Generate HTML that uses thumbnails for display, full images for lightbox
    const galleryHTML = images.map((img, index) => `
        <div class="gallery-item" onclick="openLightbox(${index})" data-full-src="${img.src}">
            <img src="${img.thumbnail}" alt="${img.thumbAlt}" loading="lazy" class="gallery-thumbnail">
            <div class="overlay">
                <div class="overlay-text">${img.alt}</div>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = galleryHTML;
    
    // CRITICAL: Manually initialize gallery system
    if (typeof window.GalleryAPI !== 'undefined' && window.GalleryAPI.initialize) {
        window.GalleryAPI.initialize(window.galleryImages);
        console.log(`✅ Gallery manually initialized: ${images.length} images for ${category}`);
    } else {
        console.warn('⚠️ GalleryAPI not available for manual initialization');
    }
    
    // Log shuffle info for debugging
    const loadCount = parseInt(localStorage.getItem(`gallery_loads_${category}`) || '0');
    const cyclePosition = ((loadCount - 1) % 3) + 1;
    console.log(`✅ Gallery populated: ${images.length} images for ${category}`);
    console.log(`📊 Load ${loadCount}, Cycle position: ${cyclePosition}/3`);
    if (cyclePosition === 1) {
        console.log('🔀 New shuffle cycle started!');
    }
}

// =============================================================================
// AUTO-DETECTION AND INITIALIZATION
// =============================================================================

/**
 * Auto-detect page and populate gallery
 */
function initializeGalleryAutomation() {
    const path = window.location.pathname;
    const filename = path.split('/').pop() || '';
    
    // Detect page and populate appropriate gallery
    if (filename.includes('headshot-photography.html')) {
        generateGalleryHTML('headshots');
    } else if (filename.includes('architecture-photography.html')) {
        generateGalleryHTML('architecture');
    } else if (filename.includes('automotive-photography.html')) {
        generateGalleryHTML('automotive');
    } else if (filename.includes('landscape-photography.html')) {
        generateGalleryHTML('landscape');
    } else if (filename.includes('engagement-couples-photography.html')) {
        generateGalleryHTML('engagement');
    } else if (filename.includes('portraits.html')) {
        generateGalleryHTML('portraits');
    } else if (filename.includes('real-estate.html')) {
        generateGalleryHTML('real-estate');        
    } else {
        console.log('No gallery automation needed for this page');
    }
}

// =============================================================================
// ERROR HANDLING AND UTILITY FUNCTIONS
// =============================================================================

/**
 * Enhanced error handling for missing images
 */
function handleImageError(event) {
    const img = event.target;
    const fallbackSrc = img.dataset.fallback || 'https://picsum.photos/400/300?random=' + Math.floor(Math.random() * 100);
    
    console.warn(`Image failed to load: ${img.src}`);
    img.src = fallbackSrc;
    img.alt = img.alt + ' (placeholder)';
}

/**
 * Add error handling to all gallery images
 */
function addImageErrorHandling() {
    document.querySelectorAll('.gallery-thumbnail').forEach(img => {
        img.addEventListener('error', handleImageError);
    });
}

// =============================================================================
// INITIALIZATION
// =============================================================================

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    initializeGalleryAutomation();
    addImageErrorHandling();
});

// =============================================================================
// PUBLIC API
// =============================================================================

// Expose functions for manual control and debugging
window.GalleryAutomation = {
    populate: generateGalleryHTML,
    getImages: populateGallery,
    collections: imageCollections,
    handleError: handleImageError,
    
    // New shuffle functions
    manualShuffle: manualShuffle,
    resetCounter: (category) => localStorage.removeItem(`gallery_loads_${category}`),
    getLoadCount: (category) => parseInt(localStorage.getItem(`gallery_loads_${category}`) || '0'),
    
    // Debug functions
    debug: {
        getCurrentCycle: (category) => Math.floor((parseInt(localStorage.getItem(`gallery_loads_${category}`) || '0') - 1) / 3),
        getCyclePosition: (category) => ((parseInt(localStorage.getItem(`gallery_loads_${category}`) || '0') - 1) % 3) + 1,
        logShuffleInfo: (category) => {
            const loads = parseInt(localStorage.getItem(`gallery_loads_${category}`) || '0');
            const cycle = Math.floor((loads - 1) / 3);
            const position = ((loads - 1) % 3) + 1;
            console.log(`${category}: Load ${loads}, Cycle ${cycle}, Position ${position}/3`);
        }
    }
};