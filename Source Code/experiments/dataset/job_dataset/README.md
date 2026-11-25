---
license: apache-2.0
size_categories:
- 10K<n<100K
task_categories:
- summarization
- text2text-generation
language:
- en
---

# Dataset Card for Dataset Name

<!-- Provide a quick summary of the dataset. -->

JobStreet Job Postings Dataset
## Dataset Details

### Dataset Description

This dataset compiles a comprehensive range of job listings from JobStreet, offering a detailed view of the current employment landscape across various industries in Malaysia. It includes key features such as unique job IDs, titles, company names, locations, job roles, categories, subcategories, job types, salaries, and detailed descriptions. The motivation behind creating and sharing this dataset is to provide actionable insights for researchers, job seekers, and organizations interested in understanding job market trends and dynamics.

The data is scheduled to be updated weekly from the output of a web scraping script.

- **Curated by:** [Azrai Mahadan]
- **Language(s) (NLP):** English
- **License:** Creative Commons Attribution 4.0 International (CC BY 4.0)

### Dataset Sources 

- **Repository:** [JobStreet Job Postings Dataset](https://huggingface.co/datasets/azrai99/job-dataset)


## Uses

### Direct Use

This dataset is suitable for various applications, including:
- Job market analysis
- Research on employment trends in Malaysia
- Machine learning model training for job recommendation systems
- Business intelligence for companies looking to understand hiring practices

### Out-of-Scope Use

This dataset should not be used for:
- Malicious applications or purposes that exploit job seekers
- Applications that require real-time data accuracy, as the dataset is updated weekly

## Dataset Structure

| Field          | Data Type      | Description                                     |
|----------------|----------------|-------------------------------------------------|
| job_id         | int64          | Unique identifier for each job posting          |
| job_title      | string         | Title of the job position                        |
| company        | string         | Name of the hiring company                       |
| descriptions   | string         | Detailed job description                         |
| location       | string         | Job location                                    |
| category       | string         | Job category (e.g., Manufacturing, Transport)  |
| subcategory    | string         | More specific job category                       |
| role           | string         | Job role                                        |
| type           | string         | Employment type (e.g., Contract/Temp, Full time)|
| salary         | string         | Salary information, if available                 |
| listingDate    | string         | Date when the job was listed                    |

## Dataset Creation

### Curation Rationale

The dataset was created to provide a transparent and accessible source of job postings, aiding in employment research and analysis within Malaysia.

### Source Data

#### Data Collection and Processing

Data was collected through a web scraping script that aggregates job postings from JobStreet. The data is filtered to remove duplicates and irrelevant postings. The fields were normalized for consistency, ensuring standardized formatting across job titles, descriptions, and salary information.

#### Who are the source data producers?

The source data is produced by various companies that list job postings on JobStreet, covering multiple sectors and industries in Malaysia.

### Annotations 

No additional annotations have been made to the dataset at this time.

#### Personal and Sensitive Information

The dataset does not contain personally identifiable information (PII) or sensitive data about job applicants.

## Bias, Risks, and Limitations

While the dataset aims to be comprehensive, it may not capture every job posting available, leading to potential biases in job market representation. The job listings are also subject to changes based on market demands, which may not be reflected immediately in the dataset.

### Recommendations

Users should be aware of the limitations of the dataset, especially regarding potential biases and the dynamic nature of job postings. It is recommended to use the dataset in conjunction with other sources for a more holistic view of the job market.

## Citation 

If you use this dataset in your work, please cite it as follows:

**BibTeX:**

@misc{jobstreet_dataset, title={JobStreet Job Postings Dataset}, author={Mohamad Azrai bin Mahadan}, year={2024}, url={https://huggingface.co/datasets/azrai99/job-dataset} }


**APA:**

Mohamad Azrai bin Mahadan(Telekom Malaysia) (2024). *JobStreet Job Postings Dataset*. https://huggingface.co/datasets/azrai99/job-dataset.


## Glossary 

- **Job ID**: A unique identifier assigned to each job posting.
- **Employment Type**: Refers to the nature of the employment contract (e.g., Full-time, Part-time, Contract).

## More Information 

For further information about the dataset or inquiries, please contact [email](azrai.mahadan@tm.com.my).

## Dataset Card Authors 

[Mohamad Azrai bin Mahadan (Telekom Malaysia)]