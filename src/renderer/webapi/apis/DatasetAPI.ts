import { DataSourceState, DataStoreState, DimSizes } from '../../state';
import { JobProgress, JobPromise } from '../Job';
import { WebAPIClient } from '../WebAPIClient';


function responseToTemporalCoverage(response: any): [string, string] | null {
    if (response && response.temporal_coverage_start && response.temporal_coverage_end) {
        return [response.temporal_coverage_start, response.temporal_coverage_end];
    }
    return null;
}

function addVerificationFlagsForTesting(dataSources: DataSourceState[]): DataSourceState[] {
    return dataSources.map((ds, i) => {
        // console.debug(`dataSources[${i}]:`, ds);
        return ds;
        /*
        if (i === 0) {
            return {
                ...ds,
                typeSpecifier: 'dataset',
                verificationFlags: null
            }
        } else if (i === 1) {
            return {
                ...ds,
                typeSpecifier: 'dataset',
                verificationFlags: ['open']
            }
        } else if (i === 2) {
            return {
                ...ds,
                typeSpecifier: 'dataset',
                verificationFlags: ['open', 'map']
            }
        } else if (i === 3) {
            return {
                ...ds,
                typeSpecifier: 'dataset',
                verificationFlags: ['open', 'map', 'cache']
            }
        } else {
            return ds;
        }
         */
    });
}

export class DatasetAPI {
    private readonly webAPIClient: WebAPIClient;

    constructor(webAPIClient: WebAPIClient) {
        this.webAPIClient = webAPIClient;
    }

    getDataStores(): JobPromise<DataStoreState[]> {
        return this.webAPIClient.call('get_data_stores', []);
    }

    getDataSources(dataStoreId: string,
                   onProgress: (progress: JobProgress) => void): JobPromise<DataSourceState[]> {
        return this.webAPIClient
                   .call('get_data_sources',
                         [dataStoreId],
                         onProgress,
                         addVerificationFlagsForTesting);
    }

    getDataSourceTemporalCoverage(dataStoreId: string, dataSourceId: string,
                                  onProgress: (progress: JobProgress) => void): JobPromise<[string, string] | null> {
        return this.webAPIClient.call('get_data_source_temporal_coverage',
                                      [dataStoreId, dataSourceId],
                                      onProgress, responseToTemporalCoverage
        );
    }

    addLocalDataSource(dataSourceId: string, filePathPattern: string,
                       onProgress: (progress: JobProgress) => void): JobPromise<DataSourceState[]> {
        return this.webAPIClient.call('add_local_data_source',
                                      [dataSourceId, filePathPattern],
                                      onProgress);
    }

    removeLocalDataSource(dataSourceId: string, removeFiles: boolean,
                          onProgress: (progress: JobProgress) => void): JobPromise<DataSourceState[]> {
        return this.webAPIClient.call('remove_local_data_source',
                                      [dataSourceId, removeFiles],
                                      onProgress);
    }

    extractPixelValues(baseDir: string,
                       source: string,
                       point: [number, number],
                       indexers: DimSizes): JobPromise<{ [varName: string]: number } | null> {
        return this.webAPIClient.call('extract_pixel_values', [baseDir, source, point, indexers]);
    }
}
