import { RuntimeConfig } from './runtime-config';
import { DEFAULT_PAGE_SIZES, REPORT_PAGE_SIZE_OPTIONS } from './constants/pagination.constants';
import { STATUS_OPTIONS } from './constants/dropdown.constants';
import { SocietyConfig } from './constants/society.constants';

export class ConstantData {
    public static readonly AccessReview = RuntimeConfig.accessReview;
    public static SuccessMessage = "Success";
    public static AccessDenied = "Access Denied";
    private static readonly noImageUrl = "assets/img/no-image.avif";
    public static RowChangesMessage = "Allow to changes all row while changing first row";

    /** Centralized Pagination */
    public static PageSizes = [...DEFAULT_PAGE_SIZES];
    public static ReportPageSizes = [...REPORT_PAGE_SIZE_OPTIONS];

    /** Centralized Status */
    public static StatusList = [...STATUS_OPTIONS];

    /** Society Business Configuration */
    public static Society = SocietyConfig;

    public static DestinationTypeList = [{ Key: 1, Value: "Domestic" }, { Key: 2, Value: "International" }];
    public static BoolList = [{ Key: true, Value: "Yes" }, { Key: false, Value: "No" }];
    private static readonly adminKey = "52F4785C-7EE7-426E-A1AE-C2300972E70A";
    private static readonly baseUrl: string = RuntimeConfig.apiUrl;
    // private static readonly baseUrl: string = "https://intranetapi.apjcop.com/";

    public static getBaseUrl(): string {
        return this.baseUrl;
    }
    public static getApiUrl(): string {
        return this.baseUrl + "api/";
    }
    public static getExamApiUrl(): string {
        return this.baseUrl + "examination/";
    }
    public static getAdminKey(): string {
        return this.adminKey;
    }
    public static getNoImage(): string {
        return this.baseUrl + this.noImageUrl;
    }
    public static allowedFileTypes = [
        'image/png',
        'image/jpeg',
        'image/jpg',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    static getFileExtension(fileName: string): string {
        const parts = fileName.split('.');
        return `.${parts.length > 1 ? parts[parts.length - 1] : ''}`;
    }
}
