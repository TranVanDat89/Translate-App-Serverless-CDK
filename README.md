### Cài đặt và Build
Cài đặt thư viện chung cho infrastructure:
npm i @ohana/shared_types --workspace=@ohana/infrastructure

Cài đặt thư viện chung cho frontend:
npm i @ohana/shared_types --workspace=@ohana/frontend

Build: Chạy lệnh npm run deploy tại thư mục root.

### Monorepo, tổ chức workspaces
Monorepo (Monolithic Repository) là một repository duy nhất chứa nhiều apps hoặc packages. Monorepo là một repository đơn chứa nhiều dự án riêng biệt, với các mối quan hệ được định nghĩa rõ ràng,

Đặc điểm chính:
- Tập trung hóa: Tất cả code của nhiều dự án trong một chỗ
- Chia sẻ code: Dễ dàng chia sẻ utilities, components, configs
- Versioning thống nhất: Quản lý dependencies và versions dễ dàng
- CI/CD đơn giản: Build, test, deploy tất cả từ một nơi

Workspaces là cách tổ chức các packages/projects trong monorepo. Workspaces cho phép bạn chia codebase thành nhiều "packages" riêng biệt sống trong cùng repository, có thể phụ thuộc lẫn nhau và chia sẻ node_modules

### Marshall và Unmarshall
Trong AWS SDK (và nói chung trong lập trình), marshall và unmarshall là hai khái niệm liên quan đến việc chuyển đổi dữ liệu giữa đối tượng trong ứng dụng và định dạng lưu trữ hoặc truyền tải (như JSON, DynamoDB item, v.v.).

| Khái niệm    | Ý nghĩa                                                                 |
| ------------ | ----------------------------------------------------------------------- |
| `marshall`   | Chuyển một object JavaScript/TypeScript thành định dạng DynamoDB        |
| `unmarshall` | Chuyển dữ liệu từ định dạng DynamoDB thành object JavaScript/TypeScript |

```
const item = {
  id: "123",
  name: "Alice",
  age: 25,
  isActive: true
};

const marshalledItem = marshall(item);

console.log(marshalledItem);
/*
{
  id: { S: '123' },
  name: { S: 'Alice' },
  age: { N: '25' },
  isActive: { BOOL: true }
}
*/
```

### Layer trong Lambda Function
Layer trong AWS Lambda là một cách để tách và tái sử dụng mã dùng chung hoặc dependencies (thư viện, framework, file cấu hình, v.v.) giữa nhiều hàm Lambda.

Layer có thể chứa: Các thư viện bên ngoài (ví dụ: node_modules trong Node.js), mã nội bộ dùng chung (helper, util functions,...),binary (ex: ffmpeg, pdftk, etc.), tập tin cấu hình.

Cách tạo:
- Tạo thư mục chứa thư viện/mã cần dùng
- Nén thư mục đó (ZIP)
- Upload lên Lambda Layer (qua AWS CLI/CDK/Console)

Cách dùng:
- Khi tạo hàm Lambda, bạn gắn Layer vào hàm
- Lambda tự động include Layer vào runtime (theo thứ tự)

AWS Lambda giải nén Layer và mã hàm chính vào cùng một môi trường thực thi. Ví dụ, với Node.js, AWS thêm nodejs/node_modules trong Layer vào NODE_PATH.

Giới hạn của Layer:
| Mục                         | Giá trị                                |
| --------------------------- | -------------------------------------- |
| Tối đa Layer/hàm            | 5                                      |
| Kích thước Layer (nén)      | ≤ 50MB                                 |
| Kích thước Layer (giải nén) | ≤ 250MB                                |
| Tái sử dụng                 | (có thể dùng chung cho nhiều Lambda)   |

### API Idempotent
Cơ chế đảm bảo khi người dùng thực hiện cùng 1 request nhiều lần do network kém, ưng dụng lag hoặc các nguyên nhân khác chỉ trả ra một kết quả, đặc biệt đối với các hành động nghiêm trọng như tạo đơn hàng, thanh toán, đăng ký tài khoản...

Thực hiện: Gửi kèm một Unique Imdempotency Key, kiểm tra đã thực hiện request với Idempotency Key đó chưa.
 
### CHú ý
Sau mỗi lần thay đổi region, cần phải chạy lại lệnh cdk bootstrap
Đối với Lambda cần có Docker để deploy
CloudFront phải chuyển region sang us-east-1